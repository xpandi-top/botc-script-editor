import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  extractYouTubeVideoId,
  buildYouTubeEmbedSrc,
  filterPersistableTracks,
  loadPersistedTracks,
  BGM_STORAGE_KEY,
} from '../hooks/useAudioState'
import { INITIAL_AUDIO_TRACKS } from '../components/StorytellerSub/constants'
import type { AudioTrack } from '../components/StorytellerSub/types'

// ── extractYouTubeVideoId ─────────────────────────────────────────────────────

describe('extractYouTubeVideoId', () => {
  it('extracts from youtu.be short link with si param', () => {
    expect(extractYouTubeVideoId('https://youtu.be/mRo7tMnM60I?si=IIlLQuF7e_vXy3Iv'))
      .toBe('mRo7tMnM60I')
  })

  it('extracts from youtu.be short link without params', () => {
    expect(extractYouTubeVideoId('https://youtu.be/mRo7tMnM60I'))
      .toBe('mRo7tMnM60I')
  })

  it('extracts from youtube.com/watch?v= URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=mRo7tMnM60I'))
      .toBe('mRo7tMnM60I')
  })

  it('extracts from youtube.com/watch?v= URL with extra params', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=mRo7tMnM60I&t=30s'))
      .toBe('mRo7tMnM60I')
  })

  it('extracts from music.youtube.com/watch?v= URL', () => {
    expect(extractYouTubeVideoId('https://music.youtube.com/watch?v=mRo7tMnM60I'))
      .toBe('mRo7tMnM60I')
  })

  it('extracts from youtube.com/embed/ URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/mRo7tMnM60I'))
      .toBe('mRo7tMnM60I')
  })

  it('returns null for non-YouTube URLs', () => {
    expect(extractYouTubeVideoId('https://music.apple.com/album/12345')).toBeNull()
  })

  it('returns null for direct audio URLs', () => {
    expect(extractYouTubeVideoId('https://example.com/track.mp3')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractYouTubeVideoId('')).toBeNull()
  })
})

// ── buildYouTubeEmbedSrc ──────────────────────────────────────────────────────

describe('buildYouTubeEmbedSrc', () => {
  it('builds embed URL with enablejsapi, loop, playlist, playsinline params', () => {
    const src = buildYouTubeEmbedSrc('mRo7tMnM60I')
    expect(src).toContain('https://www.youtube.com/embed/mRo7tMnM60I?enablejsapi=1&loop=1&playlist=mRo7tMnM60I&playsinline=1')
  })

  it('includes video ID in both embed path and playlist param (required for loop)', () => {
    const src = buildYouTubeEmbedSrc('abc123')
    expect(src).toContain('/embed/abc123')
    expect(src).toContain('playlist=abc123')
    expect(src).toContain('loop=1')
    expect(src).toContain('enablejsapi=1')
    expect(src).not.toContain('autoplay=1')
  })
})

// ── round-trip: URL → videoId → embedSrc ─────────────────────────────────────

describe('YouTube URL round-trip', () => {
  const cases = [
    ['https://youtu.be/mRo7tMnM60I?si=IIlLQuF7e_vXy3Iv', 'mRo7tMnM60I'],
    ['https://www.youtube.com/watch?v=mRo7tMnM60I', 'mRo7tMnM60I'],
    ['https://music.youtube.com/watch?v=mRo7tMnM60I', 'mRo7tMnM60I'],
  ] as const

  it.each(cases)('%s → embed URL contains correct video ID', (url, expectedId) => {
    const videoId = extractYouTubeVideoId(url)
    expect(videoId).toBe(expectedId)
    const embedSrc = buildYouTubeEmbedSrc(videoId!)
    expect(embedSrc).toContain(`/embed/${expectedId}`)
    expect(embedSrc).toContain(`playlist=${expectedId}`)
  })
})

// ── filterPersistableTracks ───────────────────────────────────────────────────

describe('filterPersistableTracks', () => {
  it('excludes all built-in initial tracks', () => {
    const result = filterPersistableTracks(INITIAL_AUDIO_TRACKS)
    expect(result).toHaveLength(0)
  })

  it('excludes blob: URLs (ephemeral local file tracks)', () => {
    const tracks: AudioTrack[] = [
      { name: 'Local File', src: 'blob:http://localhost/abc-123', type: 'audio' },
    ]
    expect(filterPersistableTracks(tracks)).toHaveLength(0)
  })

  it('keeps YouTube URL tracks', () => {
    const tracks: AudioTrack[] = [
      {
        name: 'YouTube: mRo7tMnM60I',
        src: 'https://youtu.be/mRo7tMnM60I?si=IIlLQuF7e_vXy3Iv',
        type: 'youtube',
        embedSrc: buildYouTubeEmbedSrc('mRo7tMnM60I'),
      },
    ]
    expect(filterPersistableTracks(tracks)).toHaveLength(1)
    expect(filterPersistableTracks(tracks)[0].src).toBe('https://youtu.be/mRo7tMnM60I?si=IIlLQuF7e_vXy3Iv')
  })

  it('keeps direct audio URL tracks', () => {
    const tracks: AudioTrack[] = [
      { name: 'Remote MP3', src: 'https://example.com/music.mp3', type: 'audio' },
    ]
    expect(filterPersistableTracks(tracks)).toHaveLength(1)
  })

  it('keeps custom tracks while filtering built-ins and blobs from mixed list', () => {
    const customYt: AudioTrack = {
      name: 'YouTube: mRo7tMnM60I',
      src: 'https://youtu.be/mRo7tMnM60I',
      type: 'youtube',
      embedSrc: buildYouTubeEmbedSrc('mRo7tMnM60I'),
    }
    const blob: AudioTrack = { name: 'Local', src: 'blob:http://localhost/xyz', type: 'audio' }
    const mixed = [...INITIAL_AUDIO_TRACKS, customYt, blob]
    const result = filterPersistableTracks(mixed)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(customYt)
  })
})

// ── loadPersistedTracks ───────────────────────────────────────────────────────

describe('loadPersistedTracks', () => {
  const mockStorage: Record<string, string> = {}

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => { mockStorage[key] = val },
      removeItem: (key: string) => { delete mockStorage[key] },
    })
  })

  afterEach(() => {
    delete mockStorage[BGM_STORAGE_KEY]
    vi.unstubAllGlobals()
  })

  it('returns [] when nothing stored', () => {
    expect(loadPersistedTracks()).toEqual([])
  })

  it('returns [] on invalid JSON', () => {
    mockStorage[BGM_STORAGE_KEY] = 'not-json'
    expect(loadPersistedTracks()).toEqual([])
  })

  it('returns [] when stored value is not an array', () => {
    mockStorage[BGM_STORAGE_KEY] = JSON.stringify({ foo: 'bar' })
    expect(loadPersistedTracks()).toEqual([])
  })

  it('restores persisted YouTube tracks', () => {
    const saved: AudioTrack[] = [
      {
        name: 'YouTube: mRo7tMnM60I',
        src: 'https://youtu.be/mRo7tMnM60I?si=IIlLQuF7e_vXy3Iv',
        type: 'youtube',
        embedSrc: buildYouTubeEmbedSrc('mRo7tMnM60I'),
      },
    ]
    mockStorage[BGM_STORAGE_KEY] = JSON.stringify(saved)
    const result = loadPersistedTracks()
    expect(result).toHaveLength(1)
    expect(result[0].src).toBe('https://youtu.be/mRo7tMnM60I?si=IIlLQuF7e_vXy3Iv')
    expect(result[0].type).toBe('youtube')
    expect(result[0].embedSrc).toBe(buildYouTubeEmbedSrc('mRo7tMnM60I'))
  })

  it('restores multiple persisted tracks', () => {
    const saved: AudioTrack[] = [
      { name: 'Track A', src: 'https://example.com/a.mp3', type: 'audio' },
      { name: 'Track B', src: 'https://example.com/b.mp3', type: 'audio' },
    ]
    mockStorage[BGM_STORAGE_KEY] = JSON.stringify(saved)
    expect(loadPersistedTracks()).toHaveLength(2)
  })
})

// ── persistence round-trip ────────────────────────────────────────────────────

describe('persistence round-trip', () => {
  it('filterPersistableTracks output can be serialised and restored by loadPersistedTracks', () => {
    const mockStorage: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => { mockStorage[key] = val },
      removeItem: (key: string) => { delete mockStorage[key] },
    })

    const customTrack: AudioTrack = {
      name: 'YouTube: mRo7tMnM60I',
      src: 'https://youtu.be/mRo7tMnM60I?si=IIlLQuF7e_vXy3Iv',
      type: 'youtube',
      embedSrc: buildYouTubeEmbedSrc('mRo7tMnM60I'),
    }
    const allTracks = [...INITIAL_AUDIO_TRACKS, customTrack]

    // Simulate what the hook does on tracks change
    const toSave = filterPersistableTracks(allTracks)
    mockStorage[BGM_STORAGE_KEY] = JSON.stringify(toSave)

    // Simulate what the hook does on init
    const restored = loadPersistedTracks()
    expect(restored).toHaveLength(1)
    expect(restored[0]).toEqual(customTrack)

    vi.unstubAllGlobals()
  })
})
