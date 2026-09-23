/**
 * Client for the BOTC Companion API worker (worker/): personal access tokens
 * and the cloud library. Only active when VITE_API_URL is set; requests are
 * authorized with the Google access token from Cloud Sync.
 */
import { storageSync } from './storage'
import { getValidToken } from './googleAuth'
import { CUSTOM_CHARACTERS_KEY } from '../catalog'
import { STORAGE_KEY, USER_SCRIPTS_KEY } from '../components/StorytellerSub/constants'
import type { CustomCharacter, EditableScript } from '../types'
import type { GameRecord } from '../components/StorytellerSub/types'
import { applyBundle } from './bundleIO'
import { loadInitialState } from '../components/StorytellerSub/storage'

export function getApiUrl(): string {
  return ((import.meta.env.VITE_API_URL as string | undefined) ?? '').trim().replace(/\/+$/, '')
}

export function isApiConfigured(): boolean {
  return getApiUrl() !== ''
}

export type ApiToken = { id: string; name: string; createdAt: number; lastUsedAt: number | null }

export class ApiError extends Error {}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getValidToken()
  if (!token) throw new ApiError('Not signed in to Google.')
  const res = await fetch(`${getApiUrl()}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({})) as { error?: { message?: string } }
  if (!res.ok) throw new ApiError(data.error?.message ?? `HTTP ${res.status}`)
  return data as T
}

export const listTokens = async () => (await request<{ items: ApiToken[] }>('GET', '/v1/me/tokens')).items
export const createToken = (name: string) => request<ApiToken & { token: string }>('POST', '/v1/me/tokens', { name })
export const revokeToken = (id: string) => request<void>('DELETE', `/v1/me/tokens/${encodeURIComponent(id)}`)

type LibraryItem<T> = { id: string; data: T; updatedAt: number; deleted: boolean }

function readJson<T>(raw: string | null, fallback: T): T {
  try { return raw ? (JSON.parse(raw) as T) : fallback } catch { return fallback }
}

function localScripts(): EditableScript[] {
  return readJson(storageSync.getItem(USER_SCRIPTS_KEY), [])
}

function localCharacters(): CustomCharacter[] {
  return readJson(localStorage.getItem(CUSTOM_CHARACTERS_KEY), [])
}

function localState(): { gameRecords?: GameRecord[] } & Record<string, unknown> {
  return readJson(storageSync.getItem(STORAGE_KEY), {})
}

export type LibraryCounts = { scripts: number; characters: number; records: number }

/** Upload this device's scripts, custom characters and game records (this device's copy wins). */
export async function uploadLibrary(now = Date.now()): Promise<LibraryCounts> {
  const scripts = localScripts()
  const characters = localCharacters()
  const records = localState().gameRecords ?? []
  for (const s of scripts) await request('PUT', `/v1/me/scripts/${encodeURIComponent(s.slug)}`, { data: s, updatedAt: now })
  for (const c of characters) await request('PUT', `/v1/me/characters/${encodeURIComponent(c.id)}`, { data: c, updatedAt: Math.max(c.updatedAt ?? 0, now) })
  for (const r of records) await request('PUT', `/v1/me/records/${encodeURIComponent(r.id)}`, { data: r, updatedAt: now })
  return { scripts: scripts.length, characters: characters.length, records: records.length }
}

/**
 * Add cloud items that are missing on this device (nothing local is changed
 * or removed). The page must be reloaded afterwards, like a bundle import.
 */
export async function importLibrary(): Promise<LibraryCounts> {
  const [scripts, characters, records] = await Promise.all([
    request<{ items: LibraryItem<EditableScript>[] }>('GET', '/v1/me/scripts'),
    request<{ items: LibraryItem<CustomCharacter>[] }>('GET', '/v1/me/characters'),
    request<{ items: LibraryItem<GameRecord>[] }>('GET', '/v1/me/records'),
  ])
  const haveScripts = new Set(localScripts().map((s) => s.slug))
  const haveChars = new Set(localCharacters().map((c) => c.id))
  // A normalized full state, so records can be added even before the first game is saved.
  const state = loadInitialState()
  const haveRecords = new Set(state.gameRecords.map((r) => r.id))
  const newScripts = scripts.items.filter((d) => !d.deleted && !haveScripts.has(d.id)).map((d) => d.data)
  const newChars = characters.items.filter((d) => !d.deleted && !haveChars.has(d.id)).map((d) => d.data)
  const newRecords = records.items.filter((d) => !d.deleted && !haveRecords.has(d.id)).map((d) => d.data)

  if (newScripts.length || newChars.length) {
    applyBundle({ type: 'botc-share-bundle', version: 1, exportedAt: new Date().toISOString(), scripts: newScripts, customCharacters: newChars }, { mode: 'merge', revisionOverrides: false, scriptMeta: false })
  }
  if (newRecords.length) {
    storageSync.setItem(STORAGE_KEY, JSON.stringify({ ...state, gameRecords: [...state.gameRecords, ...newRecords] }))
  }
  return { scripts: newScripts.length, characters: newChars.length, records: newRecords.length }
}
