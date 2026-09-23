/**
 * Storage for the P2 cloud library: users, personal access tokens and library
 * documents. D1LibraryStore is used in production; MemoryLibraryStore backs
 * tests. Both implement the same sync semantics:
 *
 * - Every write carries `updatedAt` (ms). The newest write wins.
 * - A write with `baseUpdatedAt` fails with a conflict when the stored copy
 *   changed since (optimistic concurrency for clients that sync).
 * - Deletes keep a tombstone so `listDocs(since)` reports them.
 */

export const DOC_KINDS = ['script', 'character', 'record'] as const
export type DocKind = (typeof DOC_KINDS)[number]

export type LibraryDoc = { id: string; kind: DocKind; data: unknown | null; updatedAt: number; deleted: boolean }

export type TokenInfo = { id: string; name: string; createdAt: number; lastUsedAt: number | null }

export type PutResult = { ok: true; doc: LibraryDoc } | { ok: false; conflict: LibraryDoc }

export interface LibraryStore {
  upsertUser(userId: string, email: string | null, now: number): Promise<void>
  createToken(userId: string, id: string, name: string, tokenHash: string, now: number): Promise<void>
  listTokens(userId: string): Promise<TokenInfo[]>
  revokeToken(userId: string, id: string, now: number): Promise<boolean>
  /** Owner of an active token, updating its last-used time. */
  useToken(tokenHash: string, now: number): Promise<string | null>
  listDocs(userId: string, kind: DocKind, since?: number): Promise<LibraryDoc[]>
  getDoc(userId: string, kind: DocKind, id: string): Promise<LibraryDoc | null>
  putDoc(userId: string, kind: DocKind, id: string, data: unknown, updatedAt: number, baseUpdatedAt?: number): Promise<PutResult>
  deleteDoc(userId: string, kind: DocKind, id: string, now: number): Promise<LibraryDoc | null>
}

type DocRow = { kind: string; id: string; data: string | null; updated_at: number; deleted_at: number | null }

const toDoc = (row: DocRow): LibraryDoc => ({
  id: row.id,
  kind: row.kind as DocKind,
  data: row.data === null ? null : JSON.parse(row.data),
  updatedAt: row.updated_at,
  deleted: row.deleted_at !== null,
})

export class D1LibraryStore implements LibraryStore {
  constructor(private readonly db: D1Database) {}

  async upsertUser(userId: string, email: string | null, now: number) {
    await this.db.prepare('INSERT INTO users (id, email, created_at, last_seen_at) VALUES (?1, ?2, ?3, ?3) ON CONFLICT(id) DO UPDATE SET email = COALESCE(?2, email), last_seen_at = ?3')
      .bind(userId, email, now).run()
  }

  async createToken(userId: string, id: string, name: string, tokenHash: string, now: number) {
    await this.db.prepare('INSERT INTO api_tokens (id, user_id, name, token_hash, created_at) VALUES (?1, ?2, ?3, ?4, ?5)')
      .bind(id, userId, name, tokenHash, now).run()
  }

  async listTokens(userId: string) {
    const { results } = await this.db.prepare('SELECT id, name, created_at, last_used_at FROM api_tokens WHERE user_id = ?1 AND revoked_at IS NULL ORDER BY created_at')
      .bind(userId).all<{ id: string; name: string; created_at: number; last_used_at: number | null }>()
    return results.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at, lastUsedAt: r.last_used_at }))
  }

  async revokeToken(userId: string, id: string, now: number) {
    const res = await this.db.prepare('UPDATE api_tokens SET revoked_at = ?3 WHERE id = ?1 AND user_id = ?2 AND revoked_at IS NULL').bind(id, userId, now).run()
    return (res.meta.changes ?? 0) > 0
  }

  async useToken(tokenHash: string, now: number) {
    const row = await this.db.prepare('SELECT id, user_id FROM api_tokens WHERE token_hash = ?1 AND revoked_at IS NULL').bind(tokenHash).first<{ id: string; user_id: string }>()
    if (!row) return null
    await this.db.prepare('UPDATE api_tokens SET last_used_at = ?2 WHERE id = ?1').bind(row.id, now).run()
    return row.user_id
  }

  async listDocs(userId: string, kind: DocKind, since?: number) {
    const stmt = since === undefined
      ? this.db.prepare('SELECT kind, id, data, updated_at, deleted_at FROM documents WHERE user_id = ?1 AND kind = ?2 AND deleted_at IS NULL ORDER BY updated_at').bind(userId, kind)
      : this.db.prepare('SELECT kind, id, data, updated_at, deleted_at FROM documents WHERE user_id = ?1 AND kind = ?2 AND updated_at > ?3 ORDER BY updated_at').bind(userId, kind, since)
    const { results } = await stmt.all<DocRow>()
    return results.map(toDoc)
  }

  async getDoc(userId: string, kind: DocKind, id: string) {
    const row = await this.db.prepare('SELECT kind, id, data, updated_at, deleted_at FROM documents WHERE user_id = ?1 AND kind = ?2 AND id = ?3').bind(userId, kind, id).first<DocRow>()
    return row ? toDoc(row) : null
  }

  async putDoc(userId: string, kind: DocKind, id: string, data: unknown, updatedAt: number, baseUpdatedAt?: number): Promise<PutResult> {
    const current = await this.getDoc(userId, kind, id)
    if (current && baseUpdatedAt !== undefined && current.updatedAt > baseUpdatedAt) return { ok: false, conflict: current }
    // Last write wins: an older write never replaces a newer one.
    if (current && current.updatedAt > updatedAt) return { ok: false, conflict: current }
    await this.db.prepare('INSERT INTO documents (user_id, kind, id, data, updated_at, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, NULL) ON CONFLICT(user_id, kind, id) DO UPDATE SET data = ?4, updated_at = ?5, deleted_at = NULL')
      .bind(userId, kind, id, JSON.stringify(data), updatedAt).run()
    return { ok: true, doc: { id, kind, data, updatedAt, deleted: false } }
  }

  async deleteDoc(userId: string, kind: DocKind, id: string, now: number) {
    const current = await this.getDoc(userId, kind, id)
    if (!current || current.deleted) return null
    const updatedAt = Math.max(now, current.updatedAt + 1)
    await this.db.prepare('UPDATE documents SET data = NULL, deleted_at = ?4, updated_at = ?4 WHERE user_id = ?1 AND kind = ?2 AND id = ?3').bind(userId, kind, id, updatedAt).run()
    return { id, kind, data: null, updatedAt, deleted: true }
  }
}

export class MemoryLibraryStore implements LibraryStore {
  private users = new Map<string, { email: string | null }>()
  private tokens = new Map<string, { id: string; userId: string; name: string; hash: string; createdAt: number; lastUsedAt: number | null; revoked: boolean }>()
  private docs = new Map<string, LibraryDoc & { userId: string }>()

  async upsertUser(userId: string, email: string | null) {
    this.users.set(userId, { email: email ?? this.users.get(userId)?.email ?? null })
  }

  async createToken(userId: string, id: string, name: string, tokenHash: string, now: number) {
    this.tokens.set(id, { id, userId, name, hash: tokenHash, createdAt: now, lastUsedAt: null, revoked: false })
  }

  async listTokens(userId: string) {
    return [...this.tokens.values()].filter((t) => t.userId === userId && !t.revoked).map((t) => ({ id: t.id, name: t.name, createdAt: t.createdAt, lastUsedAt: t.lastUsedAt }))
  }

  async revokeToken(userId: string, id: string) {
    const token = this.tokens.get(id)
    if (!token || token.userId !== userId || token.revoked) return false
    token.revoked = true
    return true
  }

  async useToken(tokenHash: string, now: number) {
    const token = [...this.tokens.values()].find((t) => t.hash === tokenHash && !t.revoked)
    if (!token) return null
    token.lastUsedAt = now
    return token.userId
  }

  private key(userId: string, kind: DocKind, id: string) {
    return `${userId}\u0000${kind}\u0000${id}`
  }

  async listDocs(userId: string, kind: DocKind, since?: number) {
    return [...this.docs.values()]
      .filter((d) => d.userId === userId && d.kind === kind && (since === undefined ? !d.deleted : d.updatedAt > since))
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .map(({ userId: _u, ...doc }) => doc)
  }

  async getDoc(userId: string, kind: DocKind, id: string) {
    const doc = this.docs.get(this.key(userId, kind, id))
    if (!doc) return null
    const { userId: _u, ...rest } = doc
    return rest
  }

  async putDoc(userId: string, kind: DocKind, id: string, data: unknown, updatedAt: number, baseUpdatedAt?: number): Promise<PutResult> {
    const current = await this.getDoc(userId, kind, id)
    if (current && baseUpdatedAt !== undefined && current.updatedAt > baseUpdatedAt) return { ok: false, conflict: current }
    if (current && current.updatedAt > updatedAt) return { ok: false, conflict: current }
    const doc: LibraryDoc = { id, kind, data, updatedAt, deleted: false }
    this.docs.set(this.key(userId, kind, id), { ...doc, userId })
    return { ok: true, doc }
  }

  async deleteDoc(userId: string, kind: DocKind, id: string, now: number) {
    const current = await this.getDoc(userId, kind, id)
    if (!current || current.deleted) return null
    const doc: LibraryDoc = { id, kind, data: null, updatedAt: Math.max(now, current.updatedAt + 1), deleted: true }
    this.docs.set(this.key(userId, kind, id), { ...doc, userId })
    return doc
  }
}
