import { useEffect, useRef, useState } from 'react'
import { INITIAL_AUDIO_TRACKS } from '../components/StorytellerSub/constants'
import type { AudioTrack } from '../components/StorytellerSub/types'

// ── YouTube URL helpers ───────────────────────────────────────────────────────

const YT_ID_RE = /^[\w-]{1,32}$/

export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([\w-]{1,32})/,
    /youtu\.be\/([\w-]{1,32})/,
    /embed\/([\w-]{1,32})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m && YT_ID_RE.test(m[1])) return m[1]
  }
  return null
}

/**
 * Base embed URL without autoplay.
 * Desktop: autoplay=1 is appended when the iframe is conditionally mounted.
 * iOS:     the base URL is loaded always; playback is triggered via src-swap (see sendYTCommand).
 */
export function buildYouTubeEmbedSrc(videoId: string): string {
  const origin = typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : ''
  const originParam = origin ? `&origin=${origin}` : ''
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&loop=1&playlist=${videoId}&playsinline=1${originParam}`
}

// iOS Safari detection.
// postMessage to cross-origin iframes does NOT carry the user gesture on iOS,
// so the YouTube IFrame API play command is silently ignored there.
export const isIOSSafari =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

// ── Persistence helpers ───────────────────────────────────────────────────────

export const BGM_STORAGE_KEY = 'botc-bgm-custom-tracks'

const INITIAL_SRCS = new Set(INITIAL_AUDIO_TRACKS.map((t) => t.src))

/** Tracks that can be saved to localStorage (excludes built-ins and ephemeral blob URLs). */
export function filterPersistableTracks(tracks: AudioTrack[]): AudioTrack[] {
  return tracks.filter((t) => !INITIAL_SRCS.has(t.src) && !t.src.startsWith('blob:'))
}

export function loadPersistedTracks(): AudioTrack[] {
  try {
    const raw = localStorage.getItem(BGM_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as AudioTrack[]
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────

// Kept for any residual cleanup calls; no longer used for creation.
export const IOS_YT_CONTAINER_ID = 'botc-yt-bgm-ios'

export function useAudioState() {
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>(() => [
    ...INITIAL_AUDIO_TRACKS,
    ...loadPersistedTracks(),
  ])
  const [selectedAudioSrc, setSelectedAudioSrc] = useState<string>(INITIAL_AUDIO_TRACKS[0].src)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [youtubeEmbedSrc, setYoutubeEmbedSrc] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Ref kept for external consumers; on iOS we manage the DOM iframe directly.
  const ytIframeRef = useRef<HTMLIFrameElement>(null)
  // Stable ref to the current base embed src so sendYTCommand can read it synchronously.
  const ytEmbedSrcRef = useRef<string | null>(null)

  // Keep a ref to tracks so effects can read current value without stale closures
  const audioTracksRef = useRef(audioTracks)
  useEffect(() => { audioTracksRef.current = audioTracks }, [audioTracks])

  /**
   * Control YouTube playback on iOS Safari via postMessage to the mini-player.
   *
   * DESKTOP: React mounts/unmounts the iframe with autoplay=1. No-op here.
   *
   * iOS: autoplay via programmatic iframe creation is blocked by Safari.
   *      A persistent mini-player iframe is rendered in StorytellerHelper
   *      (ref = ytIframeRef). The user taps it ONCE to unlock playback in
   *      that iframe's browsing context. After that, playVideo / pauseVideo
   *      via postMessage work because the context is already user-activated.
   *
   *      postMessage target '*' — covers both youtube.com and youtube-nocookie.com.
   */
  function sendYTCommand(func: 'playVideo' | 'pauseVideo' | 'stopVideo') {
    if (!isIOSSafari) return // desktop uses React mount/unmount
    const iframe = ytIframeRef.current
    if (!iframe?.contentWindow) return
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      '*'
    )
  }

  // Persist custom tracks on change
  useEffect(() => {
    const persistable = filterPersistableTracks(audioTracks)
    localStorage.setItem(BGM_STORAGE_KEY, JSON.stringify(persistable))
  }, [audioTracks])

  // Reload when track changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !selectedAudioSrc) return
    const track = audioTracksRef.current.find((t) => t.src === selectedAudioSrc)
    if (track?.type === 'youtube' && track.embedSrc) {
      ytEmbedSrcRef.current = track.embedSrc
      setYoutubeEmbedSrc(track.embedSrc)
      audio.pause()
      audio.src = ''
      return
    }
    ytEmbedSrcRef.current = null
    setYoutubeEmbedSrc(null)
    audio.src = selectedAudioSrc
    audio.loop = true
    if (audioPlaying) {
      audio.load()
      audio.play().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAudioSrc])

  // Play / pause for non-YouTube tracks
  useEffect(() => {
    const track = audioTracksRef.current.find((t) => t.src === selectedAudioSrc)
    if (track?.type === 'youtube') {
      // Desktop: controlled by iframe mount/unmount in StorytellerHelper (no-op here).
      // iOS:     controlled by sendYTCommand postMessage to mini-player (no-op here).
      return
    }
    const audio = audioRef.current
    if (!audio) return
    if (audioPlaying) audio.play().catch(() => {})
    else audio.pause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioPlaying])

  function handleLocalFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      const newTrack: AudioTrack = { name: file.name, src: url, type: 'audio' }
      setAudioTracks((cur) => [...cur, newTrack])
      setSelectedAudioSrc(url)
      setAudioPlaying(true)
    }
  }

  function handleUrlTrackAdd(url: string, customName?: string) {
    const trimmed = url.trim()
    if (!trimmed) return

    const videoId = extractYouTubeVideoId(trimmed)
    if (videoId) {
      const embedSrc = buildYouTubeEmbedSrc(videoId)
      const name = customName ?? `YouTube: ${videoId}`
      const newTrack: AudioTrack = { name, src: trimmed, type: 'youtube', embedSrc }
      setAudioTracks((cur) => [...cur, newTrack])
      setSelectedAudioSrc(trimmed)
      ytEmbedSrcRef.current = embedSrc
      setYoutubeEmbedSrc(embedSrc)
      setAudioPlaying(true)
      // iOS: mini-player will appear (audioPlaying=true); user taps it once to start.
      return
    }

    // Direct audio URL or unknown — attempt to play via HTML5 audio
    const name = customName ?? (trimmed.split('/').pop()?.split('?')[0] || 'URL Track')
    const newTrack: AudioTrack = { name, src: trimmed, type: 'audio' }
    setAudioTracks((cur) => [...cur, newTrack])
    setSelectedAudioSrc(trimmed)
    setAudioPlaying(true)
  }

  function renameTrack(src: string, newName: string) {
    setAudioTracks((cur) => cur.map((t) => t.src === src ? { ...t, name: newName } : t))
  }

  function deleteTrack(src: string) {
    if (INITIAL_SRCS.has(src)) return // built-in tracks are not deletable
    setAudioTracks((cur) => cur.filter((t) => t.src !== src))
    if (selectedAudioSrc === src) {
      setSelectedAudioSrc(INITIAL_AUDIO_TRACKS[0].src)
      setAudioPlaying(false)
      ytEmbedSrcRef.current = null
      setYoutubeEmbedSrc(null)
    }
  }

  /** Apply bgmVolume (0–1) to the <audio> element. */
  function applyVolume(vol: number) {
    if (audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, vol))
  }

  return {
    audioTracks, setAudioTracks,
    selectedAudioSrc, setSelectedAudioSrc,
    audioPlaying, setAudioPlaying,
    youtubeEmbedSrc,
    audioRef,
    ytIframeRef,
    sendYTCommand,
    handleLocalFileChange,
    handleUrlTrackAdd,
    deleteTrack,
    renameTrack,
    applyVolume,
  }
}
