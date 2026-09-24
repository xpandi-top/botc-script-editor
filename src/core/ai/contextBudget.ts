import { createWikiIndex, type WikiIndex } from './wikiIndex'

// Conservative estimate, not a model tokenizer. CJK is not space-delimited.
// Leave headroom below the reported 7,000 ITPM account limit.
export const GROQ_INPUT_BUDGET = 5500
export function estimateTokens(text: string): number {
  let units = 0
  for (const char of text) units += char.codePointAt(0)! <= 127 ? 1 / 3 : 3
  return Math.ceil(units)
}

/**
 * Closer estimate for Qwen-family tokenizers (the local WebLLM models): about
 * 1.3 tokens per CJK character and 0.3 per other character. The general
 * estimate above charges 3 per CJK character, which leaves a 4K local model
 * room for barely 1,000 Chinese characters.
 */
export function estimateQwenTokens(text: string): number {
  let units = 0
  for (const char of text) units += char.codePointAt(0)! <= 127 ? 0.3 : 1.3
  return Math.ceil(units)
}

const OMITTED = '\n[Context excerpts only; omitted material is unknown. Ask for details if needed.]'
const cache = new Map<string, WikiIndex>()

/** Index text locally, select relevant complete passages, then restore source order. */
export function selectContext(text: string, query: string, budget: number): string {
  if (estimateTokens(text) <= budget) return text
  if (budget <= estimateTokens(OMITTED)) return ''
  let index = cache.get(text)
  if (!index) {
    const chunks: string[] = []
    for (const [i, paragraph] of text.split(/\n\s*\n/).entries()) {
      let heading = ''
      // Keep small paragraphs whole; split long rosters/logs into labelled lines.
      // The first paragraph is the page's essential state (script roster, seats)
      // and is always kept whole.
      const lines = paragraph.split('\n')
      const split = lines.length > 1 && estimateTokens(paragraph) > (i === 0 ? budget * 0.8 : 450)
      if (split) heading = lines[0].trim()
      const parts = split ? lines : [paragraph]
      for (const part of parts) {
        if (!part.trim()) continue
        if (/^(===|──|Context:)/.test(part.trim())) heading = part.trim()
        chunks.push(heading && !part.includes(heading) ? `${heading}\n${part}` : part)
      }
    }
    index = createWikiIndex(chunks.map((value, i) => ({
      id: String(i), page: '', url: '', heading: '', text: value, wordCount: 0,
    })))
    // Bound memory when editing large logs repeatedly.
    if (cache.size >= 8) cache.delete(cache.keys().next().value!)
    cache.set(text, index)
  }
  const ranked = index.search(query, index.chunks.length)
  const candidates = [index.chunks[0], ...ranked, ...index.chunks].filter(Boolean)
  const selected = new Map<number, string>()
  let remaining = budget - estimateTokens(OMITTED)
  for (const chunk of candidates) {
    const id = Number(chunk.id)
    if (selected.has(id)) continue
    const cost = estimateTokens(chunk.text + '\n\n')
    // Never cut an ability or an event mid-sentence.
    if (cost > remaining) continue
    selected.set(id, chunk.text)
    remaining -= cost
  }
  return [...selected].sort(([a], [b]) => a - b).map(([, value]) => value).join('\n\n') + OMITTED
}

export type BudgetMessage = { role: 'user' | 'model'; parts: Array<{ text: string }> }
export function messageTokens(message: BudgetMessage, estimate = estimateTokens): number {
  return estimate(message.parts.map((p) => p.text).join('')) + 16
}

/** Preserve the current question and instructions; discard oldest complete turns. */
export function budgetHistory(system: string, contents: BudgetMessage[], budget: number, estimate = estimateTokens): BudgetMessage[] {
  const latest = contents[contents.length - 1]
  if (!latest) return []
  let remaining = budget - estimate(system) - 32 - messageTokens(latest, estimate)
  if (remaining < 0) {
    throw new Error('当前问题或页面内容过长，请缩小问题范围或分段提交。The current question or page context is too large; please split it into smaller requests.')
  }
  const kept = [latest]
  // A historical turn begins with user and may include one or more model messages.
  let end = contents.length - 1
  while (end > 0) {
    let start = end - 1
    while (start > 0 && contents[start].role !== 'user') start--
    if (contents[start].role !== 'user') break
    const turn = contents.slice(start, end)
    const cost = turn.reduce((sum, message) => sum + messageTokens(message, estimate), 0)
    if (cost > remaining) break
    kept.unshift(...turn)
    remaining -= cost
    end = start
  }
  return kept
}
