/**
 * YouTube BGM — mobile Safari compatibility tests
 *
 * Covers:
 *  - buildYouTubeEmbedSrc uses enablejsapi=1 + playsinline=1 (not autoplay=1)
 *  - sendYTCommand posts correct JSON to the iframe contentWindow
 *  - sendYTCommand is a no-op when ytIframeRef has no contentWindow
 *  - onReady message → playVideo posted if audioPlaying is true
 *  - onReady message → no playVideo posted if audioPlaying is false
 *  - Non-JSON / unrelated messages are ignored without throwing
 *  - play/pause effect sends correct postMessage for YouTube tracks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { buildYouTubeEmbedSrc, useAudioState } from '../hooks/useAudioState'

// ── buildYouTubeEmbedSrc — mobile Safari safe params ─────────────────────────

describe('buildYouTubeEmbedSrc (mobile Safari compatibility)', () => {
  it('uses enablejsapi=1 so postMessage control works', () => {
    expect(buildYouTubeEmbedSrc('abc123')).toContain('enablejsapi=1')
  })

  it('uses playsinline=1 so iOS does not fullscreen the video', () => {
    expect(buildYouTubeEmbedSrc('abc123')).toContain('playsinline=1')
  })

  it('does NOT use autoplay=1 (blocked by mobile Safari policy)', () => {
    expect(buildYouTubeEmbedSrc('abc123')).not.toContain('autoplay=1')
  })

  it('still includes loop=1 and playlist param for looping', () => {
    const src = buildYouTubeEmbedSrc('abc123')
    expect(src).toContain('loop=1')
    expect(src).toContain('playlist=abc123')
  })

  it('embeds the video ID in the path', () => {
    expect(buildYouTubeEmbedSrc('mRo7tMnM60I')).toContain('/embed/mRo7tMnM60I')
  })
})

// ── sendYTCommand ─────────────────────────────────────────────────────────────

describe('sendYTCommand', () => {
  const mockPostMessage = vi.fn()

  /** Attach a fake iframe contentWindow to ytIframeRef. */
  function attachFakeIframe(result: ReturnType<typeof useAudioState>) {
    Object.defineProperty(result.ytIframeRef, 'current', {
      configurable: true,
      get: () => ({ contentWindow: { postMessage: mockPostMessage } }),
    })
  }

  beforeEach(() => mockPostMessage.mockClear())

  it('posts playVideo JSON to iframe contentWindow', () => {
    const { result } = renderHook(() => useAudioState())
    attachFakeIframe(result.current)
    act(() => result.current.sendYTCommand('playVideo'))
    expect(mockPostMessage).toHaveBeenCalledTimes(1)
    const sent = JSON.parse(mockPostMessage.mock.calls[0][0])
    expect(sent).toEqual({ event: 'command', func: 'playVideo', args: [] })
  })

  it('posts pauseVideo JSON to iframe contentWindow', () => {
    const { result } = renderHook(() => useAudioState())
    attachFakeIframe(result.current)
    act(() => result.current.sendYTCommand('pauseVideo'))
    const sent = JSON.parse(mockPostMessage.mock.calls[0][0])
    expect(sent.func).toBe('pauseVideo')
  })

  it('posts stopVideo JSON to iframe contentWindow', () => {
    const { result } = renderHook(() => useAudioState())
    attachFakeIframe(result.current)
    act(() => result.current.sendYTCommand('stopVideo'))
    const sent = JSON.parse(mockPostMessage.mock.calls[0][0])
    expect(sent.func).toBe('stopVideo')
  })

  it('is a no-op when ytIframeRef.current is null', () => {
    const { result } = renderHook(() => useAudioState())
    // Leave ytIframeRef.current as null (default)
    expect(() => act(() => result.current.sendYTCommand('playVideo'))).not.toThrow()
    expect(mockPostMessage).not.toHaveBeenCalled()
  })

  it('is a no-op when ytIframeRef.current has no contentWindow', () => {
    const { result } = renderHook(() => useAudioState())
    Object.defineProperty(result.current.ytIframeRef, 'current', {
      configurable: true,
      get: () => ({ contentWindow: null }),
    })
    expect(() => act(() => result.current.sendYTCommand('playVideo'))).not.toThrow()
    expect(mockPostMessage).not.toHaveBeenCalled()
  })
})

// ── onReady postMessage listener ──────────────────────────────────────────────

describe('YouTube onReady listener', () => {
  const mockPostMessage = vi.fn()

  function attachFakeIframe(result: ReturnType<typeof useAudioState>) {
    Object.defineProperty(result.ytIframeRef, 'current', {
      configurable: true,
      get: () => ({ contentWindow: { postMessage: mockPostMessage } }),
    })
  }

  function sendMessage(data: unknown) {
    window.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify(data),
      origin: 'https://www.youtube.com',
    }))
  }

  beforeEach(() => mockPostMessage.mockClear())

  it('sends playVideo when onReady fires and audioPlaying is true', async () => {
    const { result } = renderHook(() => useAudioState())
    attachFakeIframe(result.current)

    // Simulate a YouTube track being selected and playing
    act(() => {
      result.current.handleUrlTrackAdd('https://youtu.be/abc123xyz00')
      // handleUrlTrackAdd sets audioPlaying = true internally
    })

    mockPostMessage.mockClear() // clear postMessage calls from track-add

    act(() => { sendMessage({ event: 'onReady' }) })

    const calls = mockPostMessage.mock.calls.map((c) => JSON.parse(c[0]))
    expect(calls.some((c) => c.func === 'playVideo')).toBe(true)
  })

  it('does NOT send playVideo when onReady fires and audioPlaying is false', () => {
    const { result } = renderHook(() => useAudioState())
    attachFakeIframe(result.current)

    // audioPlaying starts false, never set to true
    act(() => { sendMessage({ event: 'onReady' }) })

    const playCalls = mockPostMessage.mock.calls.filter((c) => {
      try { return JSON.parse(c[0]).func === 'playVideo' } catch { return false }
    })
    expect(playCalls).toHaveLength(0)
  })

  it('ignores non-JSON messages without throwing', () => {
    const { result: _result } = renderHook(() => useAudioState())
    expect(() => {
      act(() => {
        window.dispatchEvent(new MessageEvent('message', { data: 'not-json' }))
      })
    }).not.toThrow()
  })

  it('ignores unrelated event types without acting', () => {
    const { result } = renderHook(() => useAudioState())
    attachFakeIframe(result.current)

    act(() => { sendMessage({ event: 'onStateChange', info: 1 }) })

    expect(mockPostMessage).not.toHaveBeenCalled()
  })

  it('ignores non-string non-object data without throwing', () => {
    expect(() => {
      act(() => {
        window.dispatchEvent(new MessageEvent('message', { data: null }))
      })
    }).not.toThrow()
  })
})

// ── play/pause effect sends postMessage for YouTube tracks ────────────────────

describe('play/pause effect → postMessage for YouTube tracks', () => {
  const mockPostMessage = vi.fn()

  function attachFakeIframe(result: ReturnType<typeof useAudioState>) {
    Object.defineProperty(result.ytIframeRef, 'current', {
      configurable: true,
      get: () => ({ contentWindow: { postMessage: mockPostMessage } }),
    })
  }

  beforeEach(() => mockPostMessage.mockClear())
  afterEach(() => vi.restoreAllMocks())

  it('sends pauseVideo when audioPlaying toggled to false on a YouTube track', async () => {
    const { result } = renderHook(() => useAudioState())
    attachFakeIframe(result.current)

    await act(async () => { result.current.handleUrlTrackAdd('https://youtu.be/abc123xyz00') })
    mockPostMessage.mockClear()

    await act(async () => { result.current.setAudioPlaying(false) })

    const calls = mockPostMessage.mock.calls.map((c) => JSON.parse(c[0]))
    expect(calls.some((c) => c.func === 'pauseVideo')).toBe(true)
  })

  it('sends playVideo when audioPlaying toggled to true on a YouTube track', async () => {
    const { result } = renderHook(() => useAudioState())
    attachFakeIframe(result.current)

    // Add YT track but keep paused
    await act(async () => { result.current.handleUrlTrackAdd('https://youtu.be/abc123xyz00') })
    await act(async () => { result.current.setAudioPlaying(false) })
    mockPostMessage.mockClear()

    await act(async () => { result.current.setAudioPlaying(true) })

    const calls = mockPostMessage.mock.calls.map((c) => JSON.parse(c[0]))
    expect(calls.some((c) => c.func === 'playVideo')).toBe(true)
  })
})
