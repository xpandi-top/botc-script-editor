/**
 * Component-level types for AiPanel.
 */

import type { FillAction, AiContext } from '../../lib/ai/types'
import type { AnswerTrace } from '../../lib/ai/trace'
import type { FeedbackRating, FeedbackReason, FeedbackState } from '../../lib/ai/feedback'

export type AiPanelVariant = 'side' | 'embedded'
export type PanelTab = 'chat' | 'skills' | 'log'

export type AiChatCallbacks = {
  onFill: (field: string, value: unknown) => void
  onUndo: (field: string, oldValue: unknown) => void
}

export type AiMessage = {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
  /** Short label shown in the chat bubble instead of full content (for skill prompts) */
  displayContent?: string
  fills?: FillAction[]
  appliedFills?: string[]
  /** Hosted AI: tools the server ran for this answer, and requests left today. */
  steps?: Array<{ tool: string; ok: boolean }>
  remaining?: number | null
  /** Answered from local data without a model (localAnswer.ts). */
  local?: boolean
  /** How the answer was produced (src/lib/ai/trace.ts). */
  trace?: AnswerTrace
  /** The user's rating of this answer, and where it went. */
  feedback?: { rating: FeedbackRating; reasons: FeedbackReason[]; comment?: string; state: FeedbackState }
}

export type AiPanelContentProps = {
  open: boolean
  onClose?: () => void
  context?: AiContext
  callbacks?: AiChatCallbacks
  variant?: AiPanelVariant
}
