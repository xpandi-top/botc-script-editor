import { useEffect, useRef, useState } from 'react'
import { INITIAL_AUDIO_TRACKS } from '../components/StorytellerSub/constants'
import type { AudioTrack } from '../components/StorytellerSub/types'

// ── YouTube URL helpers ───────────────────────────────────────────────────────

export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?&#]+)/,
    /embed\/([^?&#]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export function buildYouTubeEmbedSrc(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`
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

  // Keep a ref to tracks so effects can read current value without stale closures
  const audioTracksRef = useRef(audioTracks)
  useEffect(() => { audioTracksRef.current = audioTracks }, [audioTracks])

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
    const audio = audioRef.current
    if (!audio) return
    const track = audioTracksRef.current.find((t) => t.src === selectedAudioSrc)
    if (track?.type === 'youtube') return // iframe mount/unmount handles play state
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
    handleLocalFileChange,
    handleUrlTrackAdd,
    deleteTrack,
    applyVolume,
  }
}
