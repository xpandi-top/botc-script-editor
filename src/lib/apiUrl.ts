/**
 * Base URL of the BOTC Companion API worker (VITE_API_URL). Kept apart from
 * apiClient.ts so light modules (AI settings) can check it without loading
 * the cloud-library client.
 */
export function getApiUrl(): string {
  return ((import.meta.env.VITE_API_URL as string | undefined) ?? '').trim().replace(/\/+$/, '')
}

export function isApiConfigured(): boolean {
  return getApiUrl() !== ''
}
