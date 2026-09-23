import type { VoteRecord } from '../components/StorytellerSub/types'

/** Vote IDs are timestamps; legacy nonnumeric IDs retain their newest-first storage order. */
export function newestNominations(votes: VoteRecord[]): VoteRecord[] {
  return [...votes].sort((a, b) => {
    const aTime = Number(a.id)
    const bTime = Number(b.id)
    return Number.isFinite(aTime) && Number.isFinite(bTime) ? bTime - aTime : 0
  })
}
