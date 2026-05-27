/**
 * Google Drive API v3 wrappers.
 * All data stored in appDataFolder (private, app-only, not visible in Drive UI).
 *
 * File names in appDataFolder:
 *   botc-scripts.json
 *   botc-custom-characters.json
 *   botc-revision-overrides.json
 *   botc-game-records.json
 *   botc-script-meta.json
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

export type DriveFileName =
  | 'botc-scripts.json'
  | 'botc-custom-characters.json'
  | 'botc-revision-overrides.json'
  | 'botc-game-records.json'
  | 'botc-script-meta.json'

export interface DriveFileMeta {
  id: string
  name: string
  modifiedTime: string
}

// ── Auth header helper ────────────────────────────────────────────────────────

function authHeader(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

// ── List files in appDataFolder ───────────────────────────────────────────────

export async function listDriveFiles(token: string): Promise<DriveFileMeta[]> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    fields: 'files(id,name,modifiedTime)',
    pageSize: '20',
  })
  console.log('[Drive] listDriveFiles — token prefix:', token.slice(0, 20))
  const res = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: authHeader(token),
  })
  console.log('[Drive] listDriveFiles response:', res.status)
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    console.error('[Drive] listDriveFiles error body:', errBody)
    throw new Error(`Drive list failed: ${res.status} ${errBody.slice(0, 200)}`)
  }
  const data = await res.json() as { files: DriveFileMeta[] }
  return data.files
}

// ── Find a specific file by name ──────────────────────────────────────────────

export async function findDriveFile(
  token: string,
  name: DriveFileName,
  allFiles?: DriveFileMeta[],
): Promise<DriveFileMeta | null> {
  const files = allFiles ?? await listDriveFiles(token)
  return files.find((f) => f.name === name) ?? null
}

// ── Read JSON from Drive ──────────────────────────────────────────────────────

export async function readDriveFile<T>(token: string, fileId: string): Promise<T> {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: authHeader(token),
  })
  if (!res.ok) throw new Error(`Drive read failed: ${res.status}`)
  return res.json() as Promise<T>
}

// ── Write JSON to Drive (create or update) ────────────────────────────────────

export async function writeDriveFile(
  token: string,
  name: DriveFileName,
  data: unknown,
  fileId?: string,
): Promise<string> {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })

  if (fileId) {
    // Patch existing file content (multipart)
    const form = buildMultipart(name, blob)
    const res = await fetch(`${UPLOAD_API}/files/${fileId}?uploadType=multipart`, {
      method: 'PATCH',
      headers: authHeader(token),
      body: form,
    })
    if (!res.ok) throw new Error(`Drive update failed: ${res.status}`)
    const meta = await res.json() as DriveFileMeta
    return meta.id
  } else {
    // Create new file in appDataFolder
    const form = buildMultipart(name, blob, 'appDataFolder')
    const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart`, {
      method: 'POST',
      headers: authHeader(token),
      body: form,
    })
    if (!res.ok) throw new Error(`Drive create failed: ${res.status}`)
    const meta = await res.json() as DriveFileMeta
    return meta.id
  }
}

function buildMultipart(
  name: string,
  blob: Blob,
  parent?: string,
): FormData {
  const meta: Record<string, unknown> = { name, mimeType: 'application/json' }
  if (parent) meta.parents = [parent]

  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }))
  form.append('file', blob)
  return form
}

// ── Delete a Drive file ───────────────────────────────────────────────────────

export async function deleteDriveFile(token: string, fileId: string): Promise<void> {
  await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
    headers: authHeader(token),
  })
}

// ── Bundle: read all BOTC files at once ──────────────────────────────────────

export interface DriveBundle {
  scripts?: unknown
  customCharacters?: unknown
  revisionOverrides?: unknown
  gameRecords?: unknown
  scriptMeta?: unknown
  fileMetas: Record<string, DriveFileMeta>
}

export async function readAllDriveFiles(token: string): Promise<DriveBundle> {
  const allFiles = await listDriveFiles(token)
  const byName = Object.fromEntries(allFiles.map((f) => [f.name, f]))

  const tryRead = async <T>(name: DriveFileName): Promise<T | undefined> => {
    const meta = byName[name]
    if (!meta) return undefined
    try { return await readDriveFile<T>(token, meta.id) } catch { return undefined }
  }

  const [scripts, customCharacters, revisionOverrides, gameRecords, scriptMeta] =
    await Promise.all([
      tryRead('botc-scripts.json'),
      tryRead('botc-custom-characters.json'),
      tryRead('botc-revision-overrides.json'),
      tryRead('botc-game-records.json'),
      tryRead('botc-script-meta.json'),
    ])

  return {
    scripts,
    customCharacters,
    revisionOverrides,
    gameRecords,
    scriptMeta,
    fileMetas: byName as Record<string, DriveFileMeta>,
  }
}

export async function writeAllDriveFiles(
  token: string,
  payload: {
    scripts?: unknown
    customCharacters?: unknown
    revisionOverrides?: unknown
    scriptMeta?: unknown
    gameRecords?: unknown
  },
  existingMetas?: Record<string, DriveFileMeta>,
): Promise<void> {
  const fileMetas = existingMetas ?? Object.fromEntries(
    (await listDriveFiles(token)).map((f) => [f.name, f])
  )

  const writes: Promise<void>[] = []

  const writeOne = (name: DriveFileName, data: unknown) => {
    if (data === undefined) return
    const existing = fileMetas[name]
    writes.push(writeDriveFile(token, name, data, existing?.id).then(() => undefined))
  }

  writeOne('botc-scripts.json', payload.scripts)
  writeOne('botc-custom-characters.json', payload.customCharacters)
  writeOne('botc-revision-overrides.json', payload.revisionOverrides)
  writeOne('botc-script-meta.json', payload.scriptMeta)
  writeOne('botc-game-records.json', payload.gameRecords)

  await Promise.all(writes)
}

// ── Timestamp comparison ──────────────────────────────────────────────────────

/** Returns true if any Drive file is newer than the given local timestamp. */
export function driveIsNewer(
  fileMetas: Record<string, DriveFileMeta>,
  localTimestamp: number,
): boolean {
  return Object.values(fileMetas).some(
    (f) => new Date(f.modifiedTime).getTime() > localTimestamp
  )
}
