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

// DOM container id for the iOS vanilla-DOM YouTube iframe.
// We manage this outside React so it can be created synchronously within a
// user-gesture handler — the only way iOS Safari permits iframe autoplay.
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
   * Control YouTube playback on iOS Safari.
   *
   * DESKTOP: React mounts/unmounts the iframe with autoplay=1.  sendYTCommand is a no-op.
   *
   * iOS: Setting .src on an already-mounted iframe does NOT honour the user gesture —
   *      iOS defers the actual media start until the new page loads inside the frame,
   *      which happens asynchronously, after the gesture window has closed.
   *
   *      The ONLY reliable technique: create a brand-new <iframe> element (with
   *      autoplay=1 already in the src), append it to the DOM, and hand iOS the src
   *      assignment — all synchronously within the click-handler call stack.
   *      iOS Safari sees the iframe creation as user-initiated navigation and permits
   *      autoplay.  Stop = remove the element from the DOM.
   *
   * MUST be called synchronously within the click handler for iOS to honour the gesture.
   */
  function sendYTCommand(func: 'playVideo' | 'pauseVideo' | 'stopVideo') {
    if (!isIOSSafari) return // desktop uses React mount/unmount
    const base = ytEmbedSrcRef.current
    if (!base) return

    if (func === 'playVideo') {
      // Remove any previous container first
      document.getElementById(IOS_YT_CONTAINER_ID)?.remove()
      ytIframeRef.current = null

      // Create a fresh iframe synchronously — iOS allows autoplay when the
      // element is created & src-set within the gesture handler call stack.
      // IMPORTANT: iOS withholds autoplay for zero-size / opacity:0 iframes.
      // Use real dimensions positioned far off-screen instead.
      const container = document.createElement('div')
      container.id = IOS_YT_CONTAINER_ID
      container.style.cssText = 'position:fixed;width:320px;height:180px;top:-9999px;left:-9999px;pointer-events:none;'

      const iframe = document.createElement('iframe')
      iframe.src = base + '&autoplay=1&mute=0'
      iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; gyroscope; accelerometer; picture-in-picture')
      iframe.setAttribute('allowfullscreen', '')
      iframe.setAttribute('title', 'BGM')
      iframe.style.cssText = 'width:320px;height:180px;border:none;display:block;'

      container.appendChild(iframe)
      document.body.appendChild(container)
      ytIframeRef.current = iframe
    } else {
      // Pause/stop: remove the iframe from DOM
      document.getElementById(IOS_YT_CONTAINER_ID)?.remove()
      ytIframeRef.current = null
    }
  }

  // Persist custom tracks on change
  useEffect(() => {
    const persistable = filterPersistableTracks(audioTracks)
    localStorage.setItem(BGM_STORAGE_KEY, JSON.stringify(persistable))
  }, [audioTracks])

  // Reload when track changes
  useEffect(() => {
    // iOS: stop any currently-playing iframe when the track switches.
    // The new track will only start when the user taps play (gesture required).
    if (isIOSSafari) {
      document.getElementById(IOS_YT_CONTAINER_ID)?.remove()
      ytIframeRef.current = null
    }
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
      // iOS: start playback immediately — we're still inside the button-tap gesture
      // (the ✓ button in BgmBar URL input). sendYTCommand creates a fresh iframe
      // synchronously, which iOS Safari honours as user-initiated.
      if (isIOSSafari) sendYTCommand('playVideo')
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
      if (isIOSSafari) {
        document.getElementById(IOS_YT_CONTAINER_ID)?.remove()
        ytIframeRef.current = null
      }
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
