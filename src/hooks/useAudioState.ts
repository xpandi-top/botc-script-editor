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
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&loop=1&playlist=${videoId}&playsinline=1`
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

export function useAudioState() {
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>(() => [
    ...INITIAL_AUDIO_TRACKS,
    ...loadPersistedTracks(),
  ])
  const [selectedAudioSrc, setSelectedAudioSrc] = useState<string>(INITIAL_AUDIO_TRACKS[0].src)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [youtubeEmbedSrc, setYoutubeEmbedSrc] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // iOS only — ref to the always-mounted YouTube iframe used for src-swap control.
  const ytIframeRef = useRef<HTMLIFrameElement>(null)
  // Stable ref to the current base embed src so sendYTCommand can read it synchronously.
  const ytEmbedSrcRef = useRef<string | null>(null)

  // Keep a ref to tracks so effects can read current value without stale closures
  const audioTracksRef = useRef(audioTracks)
  useEffect(() => { audioTracksRef.current = audioTracks }, [audioTracks])

  /**
   * Control YouTube playback on iOS Safari.
   *
   * DESKTOP: YouTube is controlled by mounting/unmounting the iframe with autoplay=1 in the URL.
   *          This is the original approach that worked, and we restore it for desktop.
   *          sendYTCommand is a no-op on desktop.
   *
   * iOS: postMessage to cross-origin iframes is silently ignored (no gesture crossing).
   *      Instead we swap iframe.src synchronously inside the user-gesture handler:
   *      - playVideo  → base URL + '&autoplay=1' (iOS allows autoplay when src is set
   *                     synchronously during a gesture — restarts from beginning, OK for BGM)
   *      - pause/stop → base URL without autoplay (player loads but does not start)
   *
   * MUST be called synchronously within the click handler for iOS to honour the gesture.
   */
  function sendYTCommand(func: 'playVideo' | 'pauseVideo' | 'stopVideo') {
    if (!isIOSSafari) return // desktop uses mount/unmount, not postMessage
    const iframe = ytIframeRef.current
    const base = ytEmbedSrcRef.current
    if (!iframe || !base) return
    iframe.src = func === 'playVideo' ? base + '&autoplay=1' : base
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
      // iOS:     controlled by sendYTCommand src-swap in click handlers (no-op here).
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
