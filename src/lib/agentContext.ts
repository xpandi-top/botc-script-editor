/**
 * AgentContext — describes what the user is currently editing.
 * Passed to AiChatDialog so the agent can reference and fill fields.
 */

import type { Language, Team } from '../types'

// ── Context types ─────────────────────────────────────────────────────────────

export type FormField = {
  key: string
  label: string
  value: unknown
  editable: boolean
  type: 'text' | 'multiline' | 'select' | 'number' | 'boolean'
}

export type AgentContext = {
  /** Which form/sheet is active */
  form: 'character' | 'script' | 'import' | 'none'
  /** Human-readable title shown in context chip */
  title: string
  /** All fillable fields */
  fields: FormField[]
  /** App UI language */
  language: Language
}

// ── Fill action ───────────────────────────────────────────────────────────────

export type FillAction = {
  field: string
  value: unknown
  label?: string
}

export type AgentResponse = {
  message: string
  fills?: FillAction[]
  warning?: string
}

// ── Builders ──────────────────────────────────────────────────────────────────

export type CharacterContextData = {
  id?: string
  nameEn: string
  nameZh?: string
  team: Team
  edition: string
  author: string
  abilityEn: string
  abilityZh?: string
  firstNightReminder?: string
  otherNightReminder?: string
  firstNight?: number
  otherNight?: number
}

export function buildCharacterContext(
  data: CharacterContextData,
  language: Language,
  isNew: boolean,
): AgentContext {
  const zh = language === 'zh'
  const fields: FormField[] = [
    { key: 'nameEn',             label: zh ? '英文名'      : 'Name (EN)',              value: data.nameEn,              editable: true,  type: 'text' },
    { key: 'nameZh',             label: zh ? '中文名'      : 'Name (ZH)',              value: data.nameZh ?? '',        editable: true,  type: 'text' },
    { key: 'abilityEn',          label: zh ? '能力（英文）': 'Ability (EN)',            value: data.abilityEn,           editable: true,  type: 'multiline' },
    { key: 'abilityZh',          label: zh ? '能力（中文）': 'Ability (ZH)',            value: data.abilityZh ?? '',     editable: true,  type: 'multiline' },
    { key: 'team',               label: zh ? '阵营'        : 'Team',                   value: data.team,                editable: true,  type: 'select' },
    { key: 'edition',            label: zh ? '版本'        : 'Edition',               value: data.edition,             editable: true,  type: 'text' },
    { key: 'author',             label: zh ? '作者'        : 'Author',                value: data.author,              editable: true,  type: 'text' },
    { key: 'firstNightReminder', label: zh ? '第一夜提示'  : 'First Night Reminder',  value: data.firstNightReminder ?? '', editable: true, type: 'text' },
    { key: 'otherNightReminder', label: zh ? '其余夜晚提示': 'Other Night Reminder',  value: data.otherNightReminder ?? '', editable: true, type: 'text' },
    { key: 'firstNight',         label: zh ? '第一夜顺序'  : 'First Night Order',     value: data.firstNight,          editable: true,  type: 'number' },
    { key: 'otherNight',         label: zh ? '其余夜晚顺序': 'Other Night Order',     value: data.otherNight,          editable: true,  type: 'number' },
  ]
  if (isNew) {
    fields.unshift({ key: 'id', label: 'ID', value: data.id ?? '', editable: true, type: 'text' })
  }
  return {
    form: 'character',
    title: data.nameEn || (zh ? '新角色' : 'New Character'),
    fields,
    language,
  }
}

// ── Serialise context for LLM prompt ─────────────────────────────────────────

export function serializeContextForPrompt(ctx: AgentContext): string {
  const lines = ctx.fields.map((f) => {
    const val = f.value === '' || f.value === undefined || f.value === null
      ? '(empty)'
      : String(f.value)
    return `  ${f.key} [${f.label}]: ${val}`
  })
  return `Current form: ${ctx.form} — "${ctx.title}"\nFields:\n${lines.join('\n')}`
}
