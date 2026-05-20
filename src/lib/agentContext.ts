/**
 * @deprecated use src/lib/ai instead
 *
 * Compatibility shim — re-exports from new lib/ai layer.
 */

export type { AiContext as AgentContext, AiField as FormField, FillAction, AgentResponse } from './ai/types'
export { buildCharacterContext, serializeContext as serializeContextForPrompt } from './ai/context'
export type { CharacterInput as CharacterContextData } from './ai/types'
