import { useEffect, useRef, useState } from 'react'
import { INITIAL_AUDIO_TRACKS } from '../components/StorytellerSub/constants'
import type { AudioTrack } from '../components/StorytellerSub/types'

export function useAudioState() {
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>(INITIAL_AUDIO_TRACKS)
  const [selectedAudioSrc, setSelectedAudioSrc] = useState<string>(INITIAL_AUDIO_TRACKS[0].src)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Reload when track changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !selectedAudioSrc) return
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
    if (audioPlaying) audio.play().catch(() => {})
    else audio.pause()
  }, [audioPlaying])

  function handleLocalFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      const newTrack: AudioTrack = { name: file.name, src: url }
      setAudioTracks((cur) => [...cur, newTrack])
      setSelectedAudioSrc(url)
      setAudioPlaying(true)
    }
  }

  return {
    audioTracks, setAudioTracks,
    selectedAudioSrc, setSelectedAudioSrc,
    audioPlaying, setAudioPlaying,
    audioRef,
    handleLocalFileChange,
  }
}
