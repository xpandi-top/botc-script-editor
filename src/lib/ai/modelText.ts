/**
 * Clean-up for raw model text, shared by every runtime: reasoning models
 * (Qwen3 in WebLLM, some Groq / Workers AI models) may emit their thinking,
 * or an empty <think></think> pair, before the answer.
 */
export function stripThinking(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    // An unclosed block at the start is all thinking up to the answer's first blank line.
    .replace(/^\s*<think>[\s\S]*?(\n\s*\n|$)/i, '')
    .replace(/<\/?think>/gi, '')
    .trim()
}
