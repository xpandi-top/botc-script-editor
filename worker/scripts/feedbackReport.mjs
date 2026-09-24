/**
 * Turns exported answer feedback (rows of the ai_feedback table) into what
 * tuning needs: where answers go wrong (route, provider/model, prompt
 * version, reason), how fast each route is, which answers had no local
 * passages (retrieval misses), and draft evaluation cases from 👎 items.
 * Pure functions; scripts/feedback.mjs fetches the rows.
 */

/** The rated (or last) answer's trace in a stored item. */
export function answerTrace(row) {
  try {
    const item = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
    const answers = (item.messages ?? []).filter((m) => m.role === 'assistant')
    return answers[answers.length - 1]?.trace ?? null
  } catch {
    return null
  }
}

const pct = (n, total) => (total ? `${Math.round((n / total) * 100)}%` : '–')
function quantile(values, q) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
}

/** Count rows and 👎 per value of `key(row)`. */
function byKey(rows, key) {
  const groups = new Map()
  for (const row of rows) {
    const k = key(row) ?? '(none)'
    const g = groups.get(k) ?? { total: 0, down: 0, latencies: [] }
    g.total++
    if (row.rating === 'down') g.down++
    const latency = answerTrace(row)?.latencyMs
    if (typeof latency === 'number') g.latencies.push(latency)
    groups.set(k, g)
  }
  return [...groups].sort((a, b) => b[1].total - a[1].total)
}

export function summarize(rows) {
  const rated = rows.filter((r) => r.kind === 'answer')
  const reasons = new Map()
  for (const r of rated.filter((r) => r.rating === 'down')) {
    for (const reason of JSON.parse(r.reasons || '[]')) reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
  }
  // 👎 answers that had nothing local to go on: retrieval or routing to improve.
  const misses = rated.filter((r) => {
    const t = answerTrace(r)
    return r.rating === 'down' && t && !t.facts?.length && !t.characters?.length && !t.rules?.length && !t.wiki?.length
  })
  const group = (key) => byKey(rated, key).map(([value, g]) => ({
    value, total: g.total, down: g.down, downRate: pct(g.down, g.total),
    p50ms: quantile(g.latencies, 0.5), p90ms: quantile(g.latencies, 0.9),
  }))
  return {
    items: rows.length,
    answers: rated.length,
    conversations: rows.length - rated.length,
    up: rated.filter((r) => r.rating === 'up').length,
    down: rated.filter((r) => r.rating === 'down').length,
    reasons: [...reasons].sort((a, b) => b[1] - a[1]),
    byRoute: group((r) => r.route),
    byModel: group((r) => (r.provider ? `${r.provider} · ${r.model}` : null)),
    byPrompt: group((r) => r.prompt_version),
    byFacts: group((r) => answerTrace(r)?.facts?.join('+') || '(no facts)'),
    retrievalMisses: misses.length,
  }
}

/** 👎 answers as draft evaluation cases (src/lib/ai/eval/cases.ts) to review and complete by hand. */
export function evalDrafts(rows) {
  return rows.filter((r) => r.kind === 'answer' && r.rating === 'down').map((r) => {
    const item = JSON.parse(r.payload)
    const messages = item.messages ?? []
    const last = messages.length - 1
    const question = [...messages.slice(0, last)].reverse().find((m) => m.role === 'user')?.content ?? r.question
    return {
      id: `feedback-${r.id.slice(0, 8)}`,
      language: r.language ?? item.language,
      context: item.context?.type ?? 'general',
      question,
      earlierQuestions: messages.slice(0, last).filter((m) => m.role === 'user' && m.content !== question).map((m) => m.content),
      badAnswer: messages[last]?.content,
      reasons: JSON.parse(r.reasons || '[]'),
      comment: r.comment,
      trace: answerTrace(r),
      // To fill in: what a right answer must (not) contain, as in cases.ts.
      checks: [],
    }
  })
}

export function formatSummary(s) {
  const table = (title, rows) => [
    `\n${title}`,
    ...rows.map((g) => `  ${String(g.value).padEnd(42)} ${String(g.total).padStart(5)}  👎 ${String(g.down).padStart(4)} (${g.downRate.padStart(4)})  p50 ${g.p50ms ?? '–'} ms  p90 ${g.p90ms ?? '–'} ms`),
  ].join('\n')
  return [
    `Feedback items: ${s.items} (answers ${s.answers}, shared conversations ${s.conversations})`,
    `Ratings: 👍 ${s.up}  👎 ${s.down}`,
    `👎 reasons: ${s.reasons.map(([r, n]) => `${r} ${n}`).join(', ') || '–'}`,
    `👎 answers with no program facts, characters, rules or wiki (retrieval misses): ${s.retrievalMisses}`,
    table('By route (model / program / fallback / offline):', s.byRoute),
    table('By provider · model:', s.byModel),
    table('By prompt version:', s.byPrompt),
    table('By computed facts:', s.byFacts),
  ].join('\n')
}

// ── Google Form responses (Google Sheets → File → Download → CSV) ───────────────

const FORM_JSON_MARKER = '--- botc-feedback-json ---'

/** RFC 4180 CSV: quoted fields may hold commas, quotes ("") and newlines. */
export function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((f) => f !== ''))
}

/**
 * Form responses as rows like the ai_feedback table's: the JSON block at the
 * end of "Chat History" carries kind, rating, reasons and each answer's
 * trace; the readable part carries the answers.
 */
export function rowsFromFormCsv(text) {
  const [header, ...records] = parseCsv(text.replace(/^\uFEFF/, ''))
  const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name)
  const iTime = col('timestamp'), iChat = col('chat history'), iComment = col('additional comment')
  return records.flatMap((r, index) => {
    const chat = r[iChat] ?? ''
    const [readable, json] = chat.split(FORM_JSON_MARKER)
    let meta
    try { meta = JSON.parse(json) } catch { return [] }
    const answers = readable.split(/\*\*(?:答|A)：\*\*/).slice(1).map((a) => a.split(/\n\*\*(?:问|Q)：\*\*|\n> /)[0].trim())
    const messages = meta.turns.flatMap((t, i) => [
      ...(t.q ? [{ role: 'user', content: t.q }] : []),
      { role: 'assistant', content: answers[i] ?? '', ...(t.trace ? { trace: t.trace } : {}) },
    ])
    const last = meta.turns[meta.turns.length - 1]?.trace ?? {}
    return [{
      id: `form-${index + 1}`,
      created_at: Date.parse(r[iTime]) || Date.parse(meta.at) || 0,
      kind: meta.kind, rating: meta.rating, reasons: JSON.stringify(meta.reasons ?? []),
      comment: (r[iComment] ?? '').trim() || null, language: meta.language,
      route: last.route ?? null, provider: last.provider ?? null, model: last.model ?? null,
      prompt_version: meta.promptVersion ?? null, build: meta.build ?? null,
      question: meta.turns[meta.turns.length - 1]?.q ?? null,
      payload: JSON.stringify({ context: meta.context, language: meta.language, messages }),
    }]
  })
}

