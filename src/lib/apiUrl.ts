/**
 * Base URL of the BOTC Companion API worker. Kept apart from apiClient.ts so
 * light modules (AI settings) can check it without loading the cloud-library
 * client.
 *
 * Builds use the public API unless VITE_API_URL says otherwise: another URL,
 * or "off" to build without it (no hosted AI, no cloud library). Unset or
 * empty (e.g. a missing CI secret) means the public API.
 */
export const DEFAULT_API_URL = 'https://botc-api.xpandi-top.workers.dev'

export function getApiUrl(): string {
  const value = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').trim()
  if (value.toLowerCase() === 'off') return ''
  return (value || DEFAULT_API_URL).replace(/\/+$/, '')
}

export function isApiConfigured(): boolean {
  return getApiUrl() !== ''
}
