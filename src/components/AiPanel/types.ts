/**
 * Component-level types for AiPanel.
 */

import type { FillAction, AiContext } from '../../lib/ai/types'

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
}

export type AiPanelContentProps = {
  open: boolean
  onClose?: () => void
  context?: AiContext
  callbacks?: AiChatCallbacks
  variant?: AiPanelVariant
}
