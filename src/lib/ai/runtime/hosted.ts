/**
 * Hosted runtime: the BOTC Companion API's /v1/ai/chat (worker/src/ai). A
 * Workers AI model answers with this project's MCP tools (catalog, rules,
 * script checks) on the server; the user needs no key, and daily limits
 * apply per IP or per signed-in user.
 *
 * This is an online runtime (docs/AI-ARCHITECTURE-OFFLINE-FIRST.md §8): the
 * question, recent history and the locally built evidence prompt are sent to
 * the server. Local-only use stays on WebLLM.
 */
import { budgetHistory } from '../../../core/ai/contextBudget'
import { getApiUrl, isApiConfigured } from '../../apiUrl'
import { GeminiError, type GeminiRequest, type GeminiResponse } from '../../gemini'

/** Estimated input tokens sent per request (the server model has a 131k window; this keeps requests cheap). */
export const HOSTED_INPUT_BUDGET = 12000
const MAX_MESSAGES = 40
const TIMEOUT_MS = 90_000

export type HostedStatus = {
  available: boolean
  model: string | null
  dailyLimits?: { global: number | null; perIp: number | null; perUser: number | null }
}

let statusRequest: Promise<HostedStatus> | null = null

/** GET /v1/ai/status once per page load; unavailable when the API or its AI is missing. */
export function getHostedStatus(): Promise<HostedStatus> {
  if (!isApiConfigured()) return Promise.resolve({ available: false, model: null })
  statusRequest ??= fetch(`${getApiUrl()}/v1/ai/status`, { signal: AbortSignal.timeout(8000) })
    .then(async (res) => {
      if (!res.ok) return { available: false, model: null }
      const body = await res.json() as { chat?: HostedStatus }
      return { available: !!body.chat?.available, model: body.chat?.model ?? null, dailyLimits: body.chat?.dailyLimits }
    })
    .catch(() => {
      statusRequest = null // try again next time
      return { available: false, model: null }
    })
  return statusRequest
}

export function resetHostedStatus(): void {
  statusRequest = null
}

type ErrorBody = { error?: { code?: string; message?: string; scope?: string } }

function errorMessage(status: number, body: ErrorBody | null): string {
  switch (body?.error?.code) {
    case 'ai_rate_limited':
      return body.error.scope === 'global'
        ? '今天的免费 AI 已达到全站上限，请明天再试，或在 AI 设置中改用本地模型 / 自己的 API Key。 / The free AI has reached today\'s limit for everyone. Try again tomorrow, or switch to a local model or your own API key in AI settings.'
        : '你今天的免费 AI 次数已用完，请明天再试，或在 AI 设置中改用本地模型 / 自己的 API Key。 / You have used today\'s free AI requests. Try again tomorrow, or switch to a local model or your own API key in AI settings.'
    case 'ai_quota_exhausted':
      return '服务器今天的免费 AI 额度已用完，请明天再试，或改用本地模型 / 自己的 API Key。 / The server\'s free AI allowance for today is used up. Try again tomorrow, or use a local model or your own API key.'
    case 'ai_unavailable':
      return 'BOTC 免费 AI 暂不可用，请在 AI 设置中选择其他模型。 / The BOTC hosted AI is not available; choose another model in AI settings.'
  }
  if (status === 404) return 'BOTC 服务器尚未启用 AI，请在 AI 设置中选择其他模型。 / The BOTC server has no AI yet; choose another model in AI settings.'
  return body?.error?.message ?? `HTTP ${status}`
}

/** A Google sign-in (Cloud Sync) lifts the per-IP cap to the per-user one; never prompts. */
async function optionalAuthorization(): Promise<Record<string, string>> {
  try {
    const { getValidToken } = await import('../../googleAuth')
    const token = await getValidToken()
    return token ? { authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

export async function generateHosted(req: GeminiRequest): Promise<GeminiResponse> {
  if (!isApiConfigured()) throw new GeminiError('此版本未配置 BOTC 服务器。 / This build has no BOTC API configured.')
  const system = req.systemInstruction ?? ''
  const messages = budgetHistory(system, req.contents, HOSTED_INPUT_BUDGET)
    .map((c) => ({ role: c.role === 'model' ? 'assistant' as const : 'user' as const, content: c.parts.map((p) => p.text).join('') }))
    .filter((m) => m.content.trim())
    .slice(-MAX_MESSAGES)
  while (messages.length && messages[0].role !== 'user') messages.shift()
  const body = JSON.stringify({ ...(system ? { system } : {}), messages, ...(req.temperature !== undefined ? { temperature: req.temperature } : {}) })

  const send = async (auth: Record<string, string>) => {
    try {
      return await fetch(`${getApiUrl()}/v1/ai/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...auth },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (error) {
      const timeout = error instanceof DOMException && error.name === 'TimeoutError'
      throw new GeminiError(timeout
        ? 'BOTC 免费 AI 响应超时，请缩小问题后重试。 / The hosted AI timed out; try a shorter question.'
        : '无法连接 BOTC 服务器，请检查网络。 / Cannot reach the BOTC server; check your connection.')
    }
  }

  const auth = await optionalAuthorization()
  let res = await send(auth)
  // A sign-in the server cannot verify should not block the anonymous allowance.
  if (res.status === 401 && auth.authorization) res = await send({})
  const data = await res.json().catch(() => null) as (ErrorBody & Partial<Pick<GeminiResponse, 'text' | 'model' | 'remaining' | 'usage'>> & { steps?: Array<{ tool: string; ok: boolean; arguments?: unknown }> }) | null
  if (!res.ok || !data?.text) throw new GeminiError(errorMessage(res.status, data), res.status, data)
  return {
    text: data.text,
    finishReason: 'stop',
    model: data.model,
    steps: (data.steps ?? []).map(({ tool, ok, arguments: args }) => ({ tool, ok, arguments: args })),
    remaining: data.remaining ?? null,
    ...(data.usage ? { usage: data.usage } : {}),
  }
}
