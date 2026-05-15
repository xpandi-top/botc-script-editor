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

export function buildYouTubeEmbedSrc(videoId: string): string {
  // enablejsapi=1 lets us control playback via postMessage (required for mobile Safari).
  // No autoplay=1 — mobile Safari blocks that even with allow="autoplay" on the iframe.
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&loop=1&playlist=${videoId}&playsinline=1`
}

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
  const ytIframeRef = useRef<HTMLIFrameElement>(null)

  /** Send a command to the YouTube IFrame API via postMessage.
   *  Call this synchronously inside the user-gesture handler so Mobile Safari
   *  still considers the playback request trusted. */
  function sendYTCommand(func: 'playVideo' | 'pauseVideo' | 'stopVideo') {
    const win = ytIframeRef.current?.contentWindow
    if (!win) return
    win.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*')
  }

  // Keep a ref to tracks so effects can read current value without stale closures
  const audioTracksRef = useRef(audioTracks)
  useEffect(() => { audioTracksRef.current = audioTracks }, [audioTracks])

  // Ref so the onMessage handler can read current playback state without stale closure
  const audioPlayingRef = useRef(audioPlaying)
  useEffect(() => { audioPlayingRef.current = audioPlaying }, [audioPlaying])

  // Listen for YouTube IFrame API messages.
  // When the player signals onReady (after iframe loads or src changes), auto-play
  // if we were already in playing state — handles track switches on mobile Safari.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (data?.event === 'onReady' && audioPlayingRef.current) {
          sendYTCommand('playVideo')
        }
      } catch { /* non-JSON messages from other origins — ignore */ }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      // YouTube track — stop HTML5 audio, let iframe handle playback
      setYoutubeEmbedSrc(track.embedSrc)
      audio.pause()
      audio.src = ''
      return
    }
    setYoutubeEmbedSrc(null)
    audio.src = selectedAudioSrc
    audio.loop = true
    if (audioPlaying) {
      audio.load()
      audio.play().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAudioSrc])

  // Play / pause
  useEffect(() => {
    const track = audioTracksRef.current.find((t) => t.src === selectedAudioSrc)
    if (track?.type === 'youtube') {
      // Use postMessage so Mobile Safari honours the user-gesture that caused this effect.
      // The iframe stays mounted; we command it rather than toggling its src.
      // YouTube path does not need audioRef, so check it first.
      sendYTCommand(audioPlaying ? 'playVideo' : 'pauseVideo')
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
