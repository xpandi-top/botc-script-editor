import { describe, it, expect } from 'vitest'
import { extractYouTubeVideoId, buildYouTubeEmbedSrc } from '../hooks/useAudioState'

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
  it('builds embed URL with autoplay, loop, playlist params', () => {
    const src = buildYouTubeEmbedSrc('mRo7tMnM60I')
    expect(src).toBe('https://www.youtube.com/embed/mRo7tMnM60I?autoplay=1&loop=1&playlist=mRo7tMnM60I')
  })

  it('includes video ID in both embed path and playlist param (required for loop)', () => {
    const src = buildYouTubeEmbedSrc('abc123')
    expect(src).toContain('/embed/abc123')
    expect(src).toContain('playlist=abc123')
    expect(src).toContain('loop=1')
    expect(src).toContain('autoplay=1')
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
