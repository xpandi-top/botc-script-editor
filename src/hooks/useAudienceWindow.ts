import { useEffect, useRef, useState } from 'react'
import { audienceChannelName, type AudienceMessage, type AudienceSnapshot } from '../components/StorytellerSub/presentation'

/** A single host owns all game effects; the audience only receives public snapshots. */
export function useAudienceWindow(snapshot: AudienceSnapshot) {
  const [presenting, setPresenting] = useState(false)
  const [privateView, setPrivateView] = useState(false)
  const [presentationError, setPresentationError] = useState(false)
  const connection = useRef<{ channel: BroadcastChannel; window: Window } | null>(null)
  const latest = useRef(snapshot)
  latest.current = snapshot

  function stopPresentation() {
    const current = connection.current
    if (current) {
      current.channel.postMessage({ type: 'stopped' } satisfies AudienceMessage)
      current.channel.close()
      current.window.close()
      connection.current = null
    }
    setPresenting(false)
    setPrivateView(false)
  }

  function openAudienceWindow() {
    if (connection.current && !connection.current.window.closed) {
      connection.current.window.focus()
      return
    }
    stopPresentation()
    setPresentationError(false)
    if (typeof BroadcastChannel === 'undefined') {
      setPresentationError(true)
      return
    }
    const session = crypto.randomUUID()
    const channel = new BroadcastChannel(audienceChannelName(session))
    const url = new URL(window.location.href)
    url.search = new URLSearchParams({ audience: session, lang: snapshot.language }).toString()
    url.hash = ''
    const audience = window.open(url.toString(), `botc-audience-${session}`, 'popup,width=1280,height=800')
    if (!audience) {
      channel.close()
      setPresentationError(true)
      return
    }
    connection.current = { channel, window: audience }
    channel.onmessage = (event: MessageEvent<AudienceMessage>) => {
      if (event.data?.type === 'ready') {
        channel.postMessage({ type: 'snapshot', snapshot: latest.current } satisfies AudienceMessage)
      }
    }
    setPresenting(true)
    setPrivateView(true)
  }

  useEffect(() => {
    connection.current?.channel.postMessage({ type: 'snapshot', snapshot } satisfies AudienceMessage)
  }, [snapshot])

  useEffect(() => {
    if (!presenting) return
    const timer = window.setInterval(() => {
      if (connection.current?.window.closed) {
        stopPresentation()
      } else {
        connection.current?.channel.postMessage({ type: 'snapshot', snapshot: latest.current } satisfies AudienceMessage)
      }
    }, 2000)
    return () => window.clearInterval(timer)
  }, [presenting])

  useEffect(() => {
    const disconnect = () => {
      const current = connection.current
      if (!current) return
      current.channel.postMessage({ type: 'stopped' } satisfies AudienceMessage)
      current.channel.close()
      connection.current = null
    }
    window.addEventListener('pagehide', disconnect)
    return () => {
      window.removeEventListener('pagehide', disconnect)
      disconnect()
    }
  }, [])

  return { presenting, privateView, setPrivateView, presentationError, openAudienceWindow, stopPresentation }
}
