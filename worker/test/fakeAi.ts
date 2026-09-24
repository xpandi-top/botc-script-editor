/**
 * A stand-in for the Workers AI binding: bag-of-words embeddings (so texts
 * sharing words are close) and scripted chat replies.
 */
import type { AiRunner } from '../src/env'

export const EMBED_MODEL = '@cf/baai/bge-m3'
export const CHAT_MODEL = '@cf/zai-org/glm-4.7-flash'

function hashToken(token: string): number {
  let h = 2166136261
  for (let i = 0; i < token.length; i++) h = Math.imul(h ^ token.charCodeAt(i), 16777619)
  return (h >>> 0) % 64
}

export function fakeEmbedding(text: string): number[] {
  const v = new Array(64).fill(0)
  for (const token of text.toLowerCase().match(/[a-z]+|[一-鿿]/g) ?? []) v[hashToken(token)] += 1
  v[63] += 0.01
  return v
}

export type ChatCall = { messages: Array<Record<string, unknown>>; tools?: Array<{ function: { name: string } }>; [key: string]: unknown }
export type ChatReply = { content?: string; tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>; neurons?: number } | Error

export class FakeAi implements AiRunner {
  embedCalls = 0
  embeddedTexts = 0
  chatCalls: ChatCall[] = []
  embedError?: Error
  constructor(private replies: ChatReply[] = []) {}

  queue(...replies: ChatReply[]) {
    this.replies.push(...replies)
  }

  async run(model: string, inputs: Record<string, unknown>): Promise<unknown> {
    if (model === EMBED_MODEL) {
      if (this.embedError) throw this.embedError
      const texts = inputs.text as string[]
      this.embedCalls++
      this.embeddedTexts += texts.length
      return { shape: [texts.length, 64], data: texts.map(fakeEmbedding) }
    }
    this.chatCalls.push(inputs as ChatCall)
    const reply = this.replies.shift() ?? { content: 'ok' }
    if (reply instanceof Error) throw reply
    return { choices: [{ message: { role: 'assistant', content: reply.content ?? '', tool_calls: reply.tool_calls }, finish_reason: reply.tool_calls ? 'tool_calls' : 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, ...(reply.neurons !== undefined ? { neurons: reply.neurons } : {}) } }
  }
}
