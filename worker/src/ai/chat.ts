/**
 * Chat completion over Workers AI with OpenAI-style function calling.
 * Models answer either in the OpenAI shape (`choices[0].message`) or the
 * older Workers AI shape (`response` + `tool_calls`); both are normalized.
 */
import type { AiRunner } from '../env'
import { AiServiceError, toAiServiceError } from './models'

export type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } }

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export type ToolSpec = { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }

/** `toolChoice: 'none'` keeps the tool definitions (the history refers to them) but asks for a plain answer. */
export type ChatRequest = { messages: ChatMessage[]; tools?: ToolSpec[]; toolChoice?: 'auto' | 'none'; temperature?: number; maxTokens?: number }
export type ChatResult = { content: string; toolCalls: ToolCall[] }
export type ChatModel = (req: ChatRequest) => Promise<ChatResult>

type RawToolCall = { id?: string; name?: string; arguments?: unknown; function?: { name?: string; arguments?: unknown } }
type RawResponse = {
  choices?: Array<{ message?: { content?: string | null; tool_calls?: RawToolCall[] } }>
  response?: string | null
  tool_calls?: RawToolCall[]
}

/** Reasoning models sometimes leak their thinking into the answer. */
const stripThinking = (text: string) => text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

export function parseChatResponse(raw: unknown): ChatResult {
  const r = (raw ?? {}) as RawResponse
  const message = r.choices?.[0]?.message
  const content = message?.content ?? r.response ?? ''
  const calls = message?.tool_calls ?? r.tool_calls ?? []
  return {
    content: stripThinking(typeof content === 'string' ? content : JSON.stringify(content)),
    toolCalls: calls.flatMap((call, i) => {
      const name = call.function?.name ?? call.name
      if (!name) return []
      const args = call.function?.arguments ?? call.arguments ?? {}
      return [{ id: call.id || `call_${i}`, type: 'function' as const, function: { name, arguments: typeof args === 'string' ? args : JSON.stringify(args) } }]
    }),
  }
}

export function workersAiChat(ai: AiRunner, model: string): ChatModel {
  // GLM answers faster and cheaper with its thinking step off, and still calls tools.
  const extra = /zai-org\/glm/.test(model) ? { chat_template_kwargs: { enable_thinking: false } } : {}
  return async ({ messages, tools, toolChoice, temperature, maxTokens }) => {
    let raw: unknown
    try {
      raw = await ai.run(model, {
        messages,
        ...(tools?.length ? { tools, tool_choice: toolChoice ?? 'auto' } : {}),
        temperature: temperature ?? 0.6,
        max_tokens: maxTokens ?? 1500,
        ...extra,
      })
    } catch (e) {
      throw toAiServiceError(e)
    }
    if (!raw || typeof raw !== 'object') throw new AiServiceError(`Unexpected response from ${model}.`, false)
    return parseChatResponse(raw)
  }
}
