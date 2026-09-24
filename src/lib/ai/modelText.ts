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

// A list number: "1." / "1、" after the start, a space or punctuation, before a non-digit.
const ITEM = /(^|[\s：:。；;，,])(\d{1,2})[.、．]\s*(?=[^\d\s])/g

/**
 * Small models often write "要点：1. 甲。2. 乙。" on one line; put each
 * numbered point on its own line so it renders as a list. Lines without both
 * a 1 and a 2 are left alone (versions like "1.7B" are not list numbers).
 */
export function splitInlineList(text: string): string {
  return text.split('\n').map((line) => {
    const numbers = [...line.matchAll(ITEM)].map((m) => Number(m[2]))
    if (numbers.indexOf(1) === -1 || numbers.indexOf(2) < numbers.indexOf(1)) return line
    return line.replace(ITEM, (_m, lead: string, n: string) => `${/[：:。；;，,]/.test(lead) ? lead : ''}\n${n}. `).replace(/^\n/, '')
  }).join('\n')
}

