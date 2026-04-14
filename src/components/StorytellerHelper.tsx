import { useEffect } from 'react'
import { LeftScriptPanel } from './StorytellerSub/LeftScriptPanel'
import { CompactToolbar } from './StorytellerSub/CompactToolbar'
import { Arena } from './StorytellerSub/Arena'
import { RightConsole } from './StorytellerSub/RightConsole'
import { Modals } from './StorytellerSub/Modals'
import { useStoryteller } from './StorytellerSub/useStoryteller'
import type { StorytellerHelperProps } from './StorytellerSub/types'
import '../styles.css'

export function StorytellerHelper(props: StorytellerHelperProps) {
  const ctx = useStoryteller(props)

  // Lock page scroll while storyteller is mounted
  useEffect(() => {
    document.body.classList.add('storyteller-active')
    return () => document.body.classList.remove('storyteller-active')
  }, [])

  return (
    <section className="storyteller-layout">
      <LeftScriptPanel ctx={ctx} />
      <section className="storyteller-panel">
        <CompactToolbar ctx={ctx} />
        <Arena ctx={ctx} />
      </section>
      <RightConsole ctx={ctx} />
      <Modals ctx={ctx} />
    </section>
  )
}
