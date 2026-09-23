/**
 * MCP tools for the caller's cloud library (P2). Registered only when the
 * MCP request carries a valid Authorization header.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { computeKpiSummary, computeScriptStats } from '../../../src/core/stats/records'
import { SCRIPT_TEAMS } from '../../../src/core/script/validate'
import type { CustomCharacter, EditableScript, Team } from '../../../src/core/types/catalog'
import type { GameRecord } from '../../../src/core/types/game'
import { getCatalog } from '../catalog'
import type { Env } from '../env'
import { buildDraftScript, checkScript, InputError, slugify, toEditableScript, type DraftInput } from '../scripts'
import { createScriptShareLink } from '../share'
import type { Principal } from './auth'
import { jsonSafe } from './routes'
import type { LibraryStore } from './store'

type Guard = (run: () => unknown | Promise<unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }>

export function registerLibraryTools(server: McpServer, deps: { env: Env; store: LibraryStore; principal: Principal; now: () => number; guarded: Guard }) {
  const { env, store, principal, now, guarded } = deps
  const userId = principal.userId

  server.registerTool('list_my_scripts', {
    title: 'List my scripts',
    description: "Scripts saved in the signed-in user's BOTC Companion cloud library.",
    inputSchema: {},
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  }, () => guarded(async () => (await store.listDocs(userId, 'script')).map((d) => {
    const s = d.data as EditableScript
    return { id: d.id, title: s.title, titleZh: s.titleZh, author: s.author, characterCount: s.characters.length, updatedAt: d.updatedAt }
  })))

  server.registerTool('get_my_script', {
    title: 'Get my script',
    description: 'One script from the cloud library, with its validation result.',
    inputSchema: { id: z.string() },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  }, ({ id }) => guarded(async () => {
    const doc = await store.getDoc(userId, 'script', id)
    if (!doc || doc.deleted) throw new InputError(`No script "${id}" in your library. Use list_my_scripts.`)
    const script = doc.data as EditableScript
    return { script, updatedAt: doc.updatedAt, validation: checkScript(getCatalog(), [{ id: '_meta', name: script.title }, ...script.characters.map((c) => script.customCharacters.find((cc) => cc.id === c) ?? c)]) }
  }))

  server.registerTool('save_script', {
    title: 'Save script to library',
    description: "Validate a script and save it to the user's cloud library (it appears in the app after sync). Also returns an import link. Overwrites the script with the same id.",
    inputSchema: {
      name: z.string().min(1),
      name_zh: z.string().optional(),
      author: z.string().optional(),
      characters: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).min(1),
      id: z.string().optional().describe('Library id (slug) to overwrite; defaults to a slug of the name.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  }, (input) => guarded(async () => {
    const draft = buildDraftScript(input as unknown as DraftInput)
    const validation = checkScript(getCatalog(), draft)
    if (!validation.ok) throw new InputError(`The script has errors:\n${validation.issues.filter((i) => i.severity === 'error').map((i) => `- ${i.message}`).join('\n')}`)
    const script = { ...toEditableScript(draft, input.name), ...(input.id ? { slug: slugify(input.id) } : {}) }
    const result = await store.putDoc(userId, 'script', script.slug, script, now())
    if (!result.ok) throw new InputError('A newer version of this script was saved meanwhile; retry.')
    const link = await createScriptShareLink(env, script)
    return { id: script.slug, updatedAt: result.doc.updatedAt, link: link.url, warnings: validation.issues.map((i) => i.message) }
  }))

  server.registerTool('delete_my_script', {
    title: 'Delete script from library',
    description: 'Delete a script from the cloud library (other devices remove it on their next sync).',
    inputSchema: { id: z.string() },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  }, ({ id }) => guarded(async () => {
    const doc = await store.deleteDoc(userId, 'script', id, now())
    if (!doc) throw new InputError(`No script "${id}" in your library.`)
    return { id, deleted: true }
  }))

  server.registerTool('list_my_characters', {
    title: 'List my custom characters',
    description: 'Custom characters saved in the cloud library.',
    inputSchema: {},
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  }, () => guarded(async () => (await store.listDocs(userId, 'character')).map((d) => d.data)))

  server.registerTool('save_character', {
    title: 'Save custom character',
    description: 'Create or update a custom character in the cloud library (bilingual). Ids must start with "custom_".',
    inputSchema: {
      id: z.string().regex(/^custom_[a-z0-9_]+$/).describe('e.g. custom_bard'),
      team: z.enum(SCRIPT_TEAMS as unknown as [Team, ...Team[]]),
      nameEn: z.string().min(1),
      nameZh: z.string().optional(),
      abilityEn: z.string().min(1),
      abilityZh: z.string().optional(),
      author: z.string().optional(),
      firstNightReminder: z.string().optional(),
      otherNightReminder: z.string().optional(),
      reminders: z.array(z.string()).optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  }, (input) => guarded(async () => {
    if (getCatalog().getCharacter(input.id)) throw new InputError(`"${input.id}" is already an official character id.`)
    const existing = await store.getDoc(userId, 'character', input.id)
    const t = now()
    const character: CustomCharacter = {
      ...(existing && !existing.deleted ? existing.data as CustomCharacter : {}),
      ...input,
      author: input.author ?? (existing?.data as CustomCharacter | null)?.author ?? 'Agent',
      edition: 'Custom',
      createdAt: (existing?.data as CustomCharacter | null)?.createdAt ?? t,
      updatedAt: t,
    }
    const result = await store.putDoc(userId, 'character', character.id, character, t)
    if (!result.ok) throw new InputError('A newer version of this character was saved meanwhile; retry.')
    return { id: character.id, updatedAt: t }
  }))

  server.registerTool('list_records', {
    title: 'List game records',
    description: 'Saved game records (newest first): script, winner, players, days.',
    inputSchema: { limit: z.number().int().min(1).max(100).optional() },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  }, ({ limit }) => guarded(async () => (await store.listDocs(userId, 'record'))
    .map((d) => d.data as GameRecord)
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, limit ?? 20)
    .map((r) => ({ id: r.id, name: r.recordName, script: r.scriptTitle ?? r.scriptSlug, endedAt: r.endedAt, winner: r.winner, days: r.days.length, players: r.playerSummaries?.length }))))

  server.registerTool('get_stats', {
    title: 'Get game stats',
    description: 'Win rates, game length and ratings over the saved game records, overall and per script.',
    inputSchema: {},
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  }, () => guarded(async () => {
    const records = (await store.listDocs(userId, 'record')).map((d) => d.data as GameRecord)
    return jsonSafe({ kpi: computeKpiSummary(records), scripts: computeScriptStats(records) })
  }))
}
