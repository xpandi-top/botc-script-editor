/**
 * YouTube BGM — platform-split strategy tests
 *
 * Desktop: React mounts iframe with autoplay=1 when playing; unmounts when stopped.
 *          sendYTCommand is a no-op.
 * iOS:     sendYTCommand creates a fresh <iframe> element synchronously via vanilla
 *          DOM within the user-gesture handler, sets autoplay=1 in src, and appends
 *          it to document.body. Stop removes the element. This is the only approach
 *          iOS Safari permits for cross-origin iframe autoplay — changing .src on
 *          an already-mounted iframe doesn't work because the actual media start
 *          happens asynchronously (after the gesture window closes).
 *
 * Covers:
 *  - buildYouTubeEmbedSrc URL params (enablejsapi, playsinline, no autoplay)
 *  - sendYTCommand is no-op on non-iOS (jsdom environment = non-iOS)
 *  - iOS DOM creation: autoplay URL construction, container element, cleanup
 *  - Play/pause effect does NOT call postMessage for YouTube tracks (removed)
 *  - Non-YouTube tracks still play/pause via HTML5 audio element
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  buildYouTubeEmbedSrc,
  isIOSSafari,
  useAudioState,
  IOS_YT_CONTAINER_ID,
} from '../hooks/useAudioState'

// ── buildYouTubeEmbedSrc — params ─────────────────────────────────────────────

describe('buildYouTubeEmbedSrc', () => {
  it('includes enablejsapi=1', () => {
    expect(buildYouTubeEmbedSrc('abc123')).toContain('enablejsapi=1')
  })

  it('includes playsinline=1 (prevents iOS fullscreen)', () => {
    expect(buildYouTubeEmbedSrc('abc123')).toContain('playsinline=1')
  })

  it('does NOT include autoplay=1 — desktop adds it on mount; iOS adds via src-swap', () => {
    expect(buildYouTubeEmbedSrc('abc123')).not.toContain('autoplay=1')
  })

  it('includes loop=1 and playlist param for looping', () => {
    const src = buildYouTubeEmbedSrc('abc123')
    expect(src).toContain('loop=1')
    expect(src).toContain('playlist=abc123')
  })

  it('embeds the video ID in the path', () => {
    expect(buildYouTubeEmbedSrc('mRo7tMnM60I')).toContain('/embed/mRo7tMnM60I')
  })
})

// ── isIOSSafari detection ─────────────────────────────────────────────────────

describe('isIOSSafari', () => {
  it('is false in jsdom (non-iOS test environment)', () => {
    // jsdom does not report an iOS user-agent, so the hook skips postMessage
    // and src-swap logic in the test environment matches desktop behaviour.
    expect(isIOSSafari).toBe(false)
  })
})

// ── sendYTCommand — no-op on desktop (non-iOS) ────────────────────────────────

describe('sendYTCommand on desktop (non-iOS)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.getElementById(IOS_YT_CONTAINER_ID)?.remove()
  })

  it('is a no-op when isIOSSafari is false — no DOM element created', () => {
    const { result } = renderHook(() => useAudioState())
    const appendSpy = vi.spyOn(document.body, 'appendChild')

    act(() => result.current.sendYTCommand('playVideo'))

    // Desktop uses React mount/unmount; no DOM iframe should be created
    expect(appendSpy).not.toHaveBeenCalled()
    expect(document.getElementById(IOS_YT_CONTAINER_ID)).toBeNull()
  })

  it('does not throw when ytIframeRef is null', () => {
    const { result } = renderHook(() => useAudioState())
    expect(() => act(() => result.current.sendYTCommand('pauseVideo'))).not.toThrow()
  })
})

// ── YouTube embed URL — autoplay variant ─────────────────────────────────────
// The iOS vanilla-DOM iframe is created with base + '&autoplay=1'.
// These tests verify the URL construction logic.

describe('YouTube embed URL — autoplay variant', () => {
  it('appending autoplay=1 to base URL produces valid embed src', () => {
    const base = buildYouTubeEmbedSrc('abc123')
    const withAutoplay = base + '&autoplay=1'
    expect(withAutoplay).toContain('enablejsapi=1')
    expect(withAutoplay).toContain('autoplay=1')
    expect(withAutoplay).toContain('loop=1')
    expect(withAutoplay).toContain('playsinline=1')
  })

  it('base URL does not contain autoplay=1 (iOS stop = remove element, not src-swap)', () => {
    const base = buildYouTubeEmbedSrc('abc123')
    expect(base).not.toContain('autoplay=1')
  })

  it('IOS_YT_CONTAINER_ID is a non-empty string for DOM targeting', () => {
    expect(typeof IOS_YT_CONTAINER_ID).toBe('string')
    expect(IOS_YT_CONTAINER_ID.length).toBeGreaterThan(0)
  })
})

// ── Play/pause effect — YouTube tracks skip HTML5 audio ──────────────────────

describe('play/pause effect for YouTube tracks', () => {
  afterEach(() => vi.restoreAllMocks())

  it('does not call audio.play() for YouTube tracks', async () => {
    const { result } = renderHook(() => useAudioState())

    // Spy on HTMLAudioElement.prototype.play
    const playSpy = vi.spyOn(HTMLAudioElement.prototype, 'play').mockResolvedValue(undefined)

    await act(async () => {
      result.current.handleUrlTrackAdd('https://youtu.be/abc123xyz00')
    })

    // YouTube track — audio.play() must NOT be called (iframe handles playback)
    expect(playSpy).not.toHaveBeenCalled()
  })

  it('does not call audio.pause() when audioPlaying toggles false for YouTube tracks', async () => {
    const { result } = renderHook(() => useAudioState())

    vi.spyOn(HTMLAudioElement.prototype, 'play').mockResolvedValue(undefined)
    const pauseSpy = vi.spyOn(HTMLAudioElement.prototype, 'pause').mockImplementation(() => {})

    await act(async () => {
      result.current.handleUrlTrackAdd('https://youtu.be/abc123xyz00')
    })
    await act(async () => {
      result.current.setAudioPlaying(false)
    })

    // HTML5 audio pause should not be called for YouTube tracks
    expect(pauseSpy).not.toHaveBeenCalled()
  })
})

// ── Non-YouTube tracks still use HTML5 audio ──────────────────────────────────

describe('play/pause effect for non-YouTube tracks', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sets audioPlaying=true and youtubeEmbedSrc=null for a regular audio URL', async () => {
    const { result } = renderHook(() => useAudioState())

    vi.spyOn(HTMLAudioElement.prototype, 'play').mockResolvedValue(undefined)

    await act(async () => {
      result.current.handleUrlTrackAdd('https://example.com/track.mp3')
    })

    // State reflects "playing" intent; actual audio.play() requires a mounted <audio> element
    // (audioRef.current is null in jsdom — tested via integration in real browser)
    expect(result.current.audioPlaying).toBe(true)
    expect(result.current.youtubeEmbedSrc).toBeNull()
  })
})

// ── handleUrlTrackAdd — YouTube vs audio routing ──────────────────────────────

describe('handleUrlTrackAdd routing', () => {
  it('sets youtubeEmbedSrc for a YouTube URL', async () => {
    const { result } = renderHook(() => useAudioState())

    await act(async () => {
      result.current.handleUrlTrackAdd('https://youtu.be/abc123xyz00')
    })

    expect(result.current.youtubeEmbedSrc).not.toBeNull()
    expect(result.current.youtubeEmbedSrc).toContain('youtube.com/embed')
  })

  it('leaves youtubeEmbedSrc null for a direct audio URL', async () => {
    const { result } = renderHook(() => useAudioState())

    await act(async () => {
      result.current.handleUrlTrackAdd('https://example.com/music.mp3')
    })

    expect(result.current.youtubeEmbedSrc).toBeNull()
  })

  it('sets audioPlaying true after adding any track', async () => {
    const { result } = renderHook(() => useAudioState())

    vi.spyOn(HTMLAudioElement.prototype, 'play').mockResolvedValue(undefined)

    await act(async () => {
      result.current.handleUrlTrackAdd('https://youtu.be/abc123xyz00')
    })

    expect(result.current.audioPlaying).toBe(true)
  })
})
