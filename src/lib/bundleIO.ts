/**
 * Export / Import data bundles.
 *
 * Bundle format:
 * {
 *   type: "botc-share-bundle",
 *   version: 1,
 *   exportedAt: <ISO string>,
 *   scripts?: EditableScript[],
 *   customCharacters?: CustomCharacter[],
 *   revisionOverrides?: RevisionOverrides,
 *   scriptMeta?: Record<string, unknown>,
 * }
 *
 * Small bundles (<= 100 KB) can also be encoded as a URL hash param for
 * one-click sharing: ?import=<base64url>
 */

import { storageSync } from './storage'
import { USER_SCRIPTS_KEY } from '../components/StorytellerSub/constants'
import { CUSTOM_CHARACTERS_KEY, REVISION_OVERRIDES_KEY } from '../catalog'

const SCRIPT_META_KEY = 'BOTC_SCRIPT_META'
const BUNDLE_VERSION = 1

export interface DataBundle {
  type: 'botc-share-bundle'
  version: number
  exportedAt: string
  scripts?: unknown
  customCharacters?: unknown
  revisionOverrides?: unknown
  scriptMeta?: unknown
}

// ── Export ────────────────────────────────────────────────────────────────────

export function buildBundle(options: {
  scripts?: boolean
  customCharacters?: boolean
  revisionOverrides?: boolean
  scriptMeta?: boolean
}): DataBundle {
  const readJson = (key: string, storage: Storage | typeof storageSync = localStorage): unknown => {
    try { return JSON.parse(storage.getItem(key) ?? 'null') } catch { return null }
  }

  return {
    type: 'botc-share-bundle',
    version: BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    ...(options.scripts !== false ? { scripts: readJson(USER_SCRIPTS_KEY, storageSync) } : {}),
    ...(options.customCharacters !== false ? { customCharacters: readJson(CUSTOM_CHARACTERS_KEY) } : {}),
    ...(options.revisionOverrides !== false ? { revisionOverrides: readJson(REVISION_OVERRIDES_KEY) } : {}),
    ...(options.scriptMeta !== false ? { scriptMeta: readJson(SCRIPT_META_KEY) } : {}),
  }
}

export function downloadBundle(bundle: DataBundle, filename?: string): void {
  const json = JSON.stringify(bundle, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `botc-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportEverything(): void {
  downloadBundle(buildBundle({
    scripts: true,
    customCharacters: true,
    revisionOverrides: true,
    scriptMeta: true,
  }))
}

// ── Import ────────────────────────────────────────────────────────────────────

const MAX_BUNDLE_FILE_SIZE = 10_000_000 // 10 MB

function isArrayOfObjects(v: unknown): v is Record<string, unknown>[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'object' && x !== null)
}

function isRecordOfStrings(v: unknown): boolean {
  return typeof v === 'object' && v !== null && !Array.isArray(v) &&
    Object.values(v as Record<string, unknown>).every((x) => typeof x === 'string' || typeof x === 'object')
}

export function validateBundle(raw: unknown): DataBundle {
  if (typeof raw !== 'object' || raw === null) throw new Error('Not a valid BOTC bundle')
  const b = raw as Record<string, unknown>
  if (b.type !== 'botc-share-bundle') throw new Error('Not a valid BOTC bundle')
  if (typeof b.version !== 'number') throw new Error('Bundle missing version')

  // Payload shape validation — reject structurally invalid fields
  if (b.scripts !== undefined && b.scripts !== null && !isArrayOfObjects(b.scripts))
    throw new Error('Bundle scripts field is invalid')
  if (b.customCharacters !== undefined && b.customCharacters !== null && !isArrayOfObjects(b.customCharacters))
    throw new Error('Bundle customCharacters field is invalid')
  if (b.revisionOverrides !== undefined && b.revisionOverrides !== null && !isRecordOfStrings(b.revisionOverrides))
    throw new Error('Bundle revisionOverrides field is invalid')
  if (b.scriptMeta !== undefined && b.scriptMeta !== null &&
    (typeof b.scriptMeta !== 'object' || Array.isArray(b.scriptMeta)))
    throw new Error('Bundle scriptMeta field is invalid')

  return raw as DataBundle
}

export interface ImportResult {
  scriptsImported: boolean
  customCharsImported: boolean
  revisionOverridesImported: boolean
  scriptMetaImported: boolean
}

export function applyBundle(bundle: DataBundle, options: {
  scripts?: boolean
  customCharacters?: boolean
  revisionOverrides?: boolean
  scriptMeta?: boolean
  mode?: 'replace' | 'merge'
}): ImportResult {
  const result: ImportResult = {
    scriptsImported: false,
    customCharsImported: false,
    revisionOverridesImported: false,
    scriptMetaImported: false,
  }

  const mode = options.mode ?? 'replace'

  if (options.scripts !== false && bundle.scripts != null) {
    if (mode === 'replace') {
      storageSync.setItem(USER_SCRIPTS_KEY, JSON.stringify(bundle.scripts))
    } else {
      // Merge: append new slugs, skip existing
      try {
        const existing = JSON.parse(storageSync.getItem(USER_SCRIPTS_KEY) ?? '[]') as { slug: string }[]
        const incoming = bundle.scripts as { slug: string }[]
        const existingSlugs = new Set(existing.map((s) => s.slug))
        const merged = [...existing, ...incoming.filter((s) => !existingSlugs.has(s.slug))]
        storageSync.setItem(USER_SCRIPTS_KEY, JSON.stringify(merged))
      } catch {
        storageSync.setItem(USER_SCRIPTS_KEY, JSON.stringify(bundle.scripts))
      }
    }
    result.scriptsImported = true
  }

  if (options.customCharacters !== false && bundle.customCharacters != null) {
    if (mode === 'replace') {
      localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(bundle.customCharacters))
    } else {
      try {
        const existing = JSON.parse(localStorage.getItem(CUSTOM_CHARACTERS_KEY) ?? '[]') as { id: string }[]
        const incoming = bundle.customCharacters as { id: string }[]
        const existingIds = new Set(existing.map((c) => c.id))
        const merged = [...existing, ...incoming.filter((c) => !existingIds.has(c.id))]
        localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(merged))
      } catch {
        localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(bundle.customCharacters))
      }
    }
    result.customCharsImported = true
  }

  if (options.revisionOverrides !== false && bundle.revisionOverrides != null) {
    if (mode === 'replace') {
      localStorage.setItem(REVISION_OVERRIDES_KEY, JSON.stringify(bundle.revisionOverrides))
    } else {
      try {
        const existing = JSON.parse(localStorage.getItem(REVISION_OVERRIDES_KEY) ?? '{}') as Record<string, unknown>
        const incoming = bundle.revisionOverrides as Record<string, unknown>
        localStorage.setItem(REVISION_OVERRIDES_KEY, JSON.stringify({ ...existing, ...incoming }))
      } catch {
        localStorage.setItem(REVISION_OVERRIDES_KEY, JSON.stringify(bundle.revisionOverrides))
      }
    }
    result.revisionOverridesImported = true
  }

  if (options.scriptMeta !== false && bundle.scriptMeta != null) {
    if (mode === 'replace') {
      localStorage.setItem(SCRIPT_META_KEY, JSON.stringify(bundle.scriptMeta))
    } else {
      try {
        const existing = JSON.parse(localStorage.getItem(SCRIPT_META_KEY) ?? '{}') as Record<string, unknown>
        const incoming = bundle.scriptMeta as Record<string, unknown>
        localStorage.setItem(SCRIPT_META_KEY, JSON.stringify({ ...existing, ...incoming }))
      } catch {
        localStorage.setItem(SCRIPT_META_KEY, JSON.stringify(bundle.scriptMeta))
      }
    }
    result.scriptMetaImported = true
  }

  return result
}

export async function readBundleFile(file: File): Promise<DataBundle> {
  if (file.size > MAX_BUNDLE_FILE_SIZE) {
    throw new Error(`Bundle file too large (${(file.size / 1_000_000).toFixed(1)} MB, max 10 MB)`)
  }
  const text = await file.text()
  const raw = JSON.parse(text)
  return validateBundle(raw)
}
