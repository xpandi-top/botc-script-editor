import { LeftLogPanel } from './StorytellerSub/LeftLogPanel'
import { CompactToolbar } from './StorytellerSub/CompactToolbar'
import { Arena } from './StorytellerSub/Arena'
import { RightConsole } from './StorytellerSub/RightConsole'
import { Modals } from './StorytellerSub/Modals'
import { useStoryteller } from './StorytellerSub/useStoryteller'
import type { StorytellerHelperProps } from './StorytellerSub/types'
import '../styles.css'

export function StorytellerHelper(props: StorytellerHelperProps) {
  console.log('StorytellerHelper mounted, props:', props);
  const ctx = useStoryteller(props)
  console.log('StorytellerHelper ctx:', ctx);
  
  return (
    <section className={`storyteller-layout${ctx.showLogPanel ? ' storyteller-layout--log' : ''}${ctx.showRightPanel ? ' storyteller-layout--panel' : ''}`}>
      <LeftLogPanel ctx={ctx} />
      <section className="storyteller-panel">
        <CompactToolbar ctx={ctx} />
        <Arena ctx={ctx} />
      </section>
      <RightConsole ctx={ctx} />
      <Modals ctx={ctx} />
      <audio ref={ctx.audioRef} />
    </section>
  )
}
