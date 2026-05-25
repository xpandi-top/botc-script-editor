# Script Import & Scripts Tab Redesign

Design document for external script import (bloodstar.xyz / SE format), Scripts tab UI overhaul, custom character versioning, night order override pipeline, reminder token editing on characters, and ST Helper reminder token integration.

**Status:** Draft  
**Date:** 2026-05-18  
**Scope:** `src/types.ts`, `src/catalog.ts`, `src/lib/parseBloodstar.ts`, `src/components/CustomCharDialog.tsx`, `src/components/ScriptsTab/*`, ST Helper night phase

---

## Table of Contents

1. [Data Model / Type Extensions](#1-data-model--type-extensions)
2. [Format Mapping — Bloodstar → Project](#2-format-mapping--bloodstar--project)
3. [Night Order Override Pipeline](#3-night-order-override-pipeline)
4. [Script Parser Logic](#4-script-parser-logic)
5. [Scripts Tab UI Redesign](#5-scripts-tab-ui-redesign)
6. [Script Folders](#6-script-folders)
7. [Script Import Flow (UI)](#7-script-import-flow-ui)
8. [Character Editor — Reminder Token Fields](#8-character-editor--reminder-token-fields)
9. [ST Helper Night Phase — Reminder Tags](#9-st-helper-night-phase--reminder-tags)
10. [Storage & Migration](#10-storage--migration)
11. [Implementation Phases](#11-implementation-phases)

---

## 1. Data Model / Type Extensions

### 1.1 `CustomCharacterRevision` — New Type

Snapshot of a character's mutable fields at a specific version. Stored inside `CustomCharacter.revisionHistory`. Never mutated after creation.

```typescript
// src/types.ts

export type CustomCharacterRevision = {
  /** Version string at time of snapshot. e.g. "1.0", "2.3", "20260101" */
  version: string
  savedAt: number          // Unix ms timestamp
  abilityEn: string
  abilityZh?: string
  nameEn: string
  nameZh?: string
  /** Night order positions at time of snapshot. */
  firstNight?: number
  otherNight?: number
}
```

---

### 1.2 `CustomCharacter` — Extended

All new fields are optional — existing stored objects load without migration.

```typescript
// src/types.ts

export type CustomCharacter = {
  // ── Identity ──────────────────────────────────────────────────────────────
  id: string                      // must start with "custom_"
  author: string
  team: Team
  edition: string                 // user label e.g. "Custom", "Silk Songs"

  // ── Display ───────────────────────────────────────────────────────────────
  nameEn: string
  nameZh?: string
  abilityEn: string
  abilityZh?: string
  /** Embedded icon: data URL (128 px JPEG) or https:// URL. Highest priority. */
  icon?: string
  /**
   * External image URL (e.g. bloodstar.xyz CDN).
   * Used when icon is absent. Never fetched to base64 at import time.
   */
  imageUrl?: string

  // ── Night order ───────────────────────────────────────────────────────────
  /**
   * 1-based position in first night wake order.
   * 0 or absent = does not wake first night.
   * Stored from import; may be overridden per-script via EditableScript.nightOrderOverride.
   */
  firstNight?: number
  firstNightReminder?: string
  /**
   * 1-based position in other nights wake order.
   * Same semantics as firstNight.
   */
  otherNight?: number
  otherNightReminder?: string

  // ── Game tokens ───────────────────────────────────────────────────────────
  /** Reminder tokens this character places on OTHER players' seats. */
  reminders?: string[]
  /** Reminder tokens available on ALL seats regardless of assignment. */
  remindersGlobal?: string[]
  jinxes?: Array<{ id: string; reason: string }>

  // ── Versioning ────────────────────────────────────────────────────────────
  /**
   * Current version string. Sourced from _meta.version in the originating
   * script, or auto-generated as "1.0" on first import.
   * Updated when the user applies an incoming update.
   */
  version?: string
  /**
   * Slug of the script this character was first imported from.
   * Used to trace provenance and to detect updates when re-importing.
   */
  sourceScriptSlug?: string
  /**
   * Ordered history of past versions (oldest first).
   * Appended when the user applies an update over an existing character.
   * Current state is NOT duplicated here — only prior states.
   */
  revisionHistory?: CustomCharacterRevision[]

  // ── Timestamps ────────────────────────────────────────────────────────────
  createdAt: number
  updatedAt: number
}
```

---

### 1.3 `EditableScript` — Extended

```typescript
// src/types.ts

export type EditableScript = {
  // ── Existing fields (unchanged) ──────────────────────────────────────────
  slug: string
  title: string
  titleZh: string
  author: string
  edition: string
  characters: string[]            // character ids (catalog ids OR custom_ ids)
  meta: ScriptMetaEntry
  customCharacters: ScriptCharacterItem[]   // inline custom chars (legacy / non-library)
  sourceFile: string
  notes?: string
  tags?: string[]
  pinnedRevisions?: Record<string, string>

  // ── Version ───────────────────────────────────────────────────────────────
  /**
   * Script version string. Sourced from _meta.version at import.
   * Used to detect when a re-imported script has a newer version.
   */
  version?: string

  // ── Night order override ──────────────────────────────────────────────────
  /**
   * Per-script night order map: characterId → 1-based position.
   * 0 = does not wake that night. Absent key = use character's own value.
   *
   * PRIORITY: script nightOrderOverride > CustomCharacter.firstNight/otherNight
   *           > catalog night-order.json
   *
   * Populated automatically at import from bloodstar firstNight/otherNight fields.
   * User can override manually per script.
   */
  nightOrderOverride?: {
    firstNight: Record<string, number>
    otherNight: Record<string, number>
  }

  // ── Import provenance ─────────────────────────────────────────────────────
  /** How this script entered the user's library. */
  importSource?: 'bloodstar' | 'manual' | 'file' | 'url'
  /** Original URL if importSource is 'url'. */
  importUrl?: string
  /** Logo image URL from the _meta element. */
  logoUrl?: string
  /** Almanac URL from the _meta element. */
  almanacUrl?: string
  /** Folder this script belongs to. undefined = uncategorized. */
  folderId?: string
}
```

---

### 1.4 `ScriptFolder` — New Type

```typescript
// src/types.ts

export type ScriptFolder = {
  /** Stable unique id. e.g. "folder_1716000000_abc3". Never changes after creation. */
  id: string
  name: string
  /** Lower = shown higher in the list. Gap-10 convention (10, 20, 30…). */
  order: number
  /** Collapsed in the script list sidebar. */
  collapsed?: boolean
}
```

**Rules:**
- Deleting a folder → member scripts get `folderId = undefined` (never deleted).
- Built-in (bundled) scripts cannot be assigned a folder.
- One level only — no nesting.

---

### 1.5 Transient Import Types

Produced by the parser; consumed by the import dialog; never persisted as-is.

```typescript
// src/types.ts

/**
 * Result of parseBloodstarJson / parseScriptUrl.
 * Holds all parsed data before the user confirms import.
 */
export type ImportedScriptPreview = {
  title: string
  author: string
  version?: string               // from _meta.version
  logoUrl?: string
  almanacUrl?: string
  sourceRef: string              // filename or URL
  importSource: 'bloodstar' | 'file' | 'url'

  characters: ParsedImportCharacter[]

  /** Night order: characterIds sorted ascending by firstNight value (0-excluded). */
  firstNightOrder: string[]
  /** Night order: characterIds sorted ascending by otherNight value (0-excluded). */
  otherNightOrder: string[]

  /**
   * Map used to build EditableScript.nightOrderOverride.
   * key = characterId (without custom_ prefix at this stage).
   */
  nightOrderMap: {
    firstNight: Record<string, number>
    otherNight: Record<string, number>
  }

  conflicts: ImportConflict[]
}

export type ParsedImportCharacter = {
  id: string                     // normalized, no custom_ prefix yet
  name: string
  team: Team
  ability: string
  imageUrl?: string
  reminders?: string[]
  remindersGlobal?: string[]
  firstNight?: number
  firstNightReminder?: string
  otherNight?: number
  otherNightReminder?: string
}

export type ImportConflict = {
  id: string
  existsIn: 'catalog' | 'customChars'
  /**
   * 'update' only applies when existsIn = 'customChars' AND incoming version
   * differs from stored version. Shows diff of ability text.
   */
  kind: 'id-clash' | 'update'
  /** Version of the currently stored character, if kind = 'update'. */
  storedVersion?: string
  /** Incoming version, if kind = 'update'. */
  incomingVersion?: string
  /** Stored ability text, for diff display. */
  storedAbility?: string
  resolution: 'skip' | 'update' | 'keepBoth'
}

export type ImportResolution = {
  characterId: string
  action: 'import' | 'skip' | 'update' | 'replace'
  resolvedId?: string            // set when action = 'keepBoth', suffix appended
}
```

---

## 2. Format Mapping — Bloodstar → Project

### 2.1 Bloodstar / SE External Format

```json
[
  {
    "id": "_meta",
    "name": "Silk Songs",
    "author": "Jane Doe",
    "version": "1.3",
    "logo": "https://example.bloodstar.xyz/logo.png",
    "almanac": "https://example.html"
  },
  {
    "id": "1_silksong",
    "image": "https://example.bloodstar.xyz/1_silksong.png",
    "name": "Silkweaver",
    "team": "townsfolk",
    "ability": "Each night*, you learn...",
    "reminders": ["Seen"],
    "remindersGlobal": [],
    "firstNight": 0,
    "firstNightReminder": "",
    "otherNight": 5,
    "otherNightReminder": "Show the Silkweaver token."
  }
]
```

### 2.2 Field Mapping Table

| Bloodstar field | Maps to | Notes |
|----------------|---------|-------|
| `_meta.name` | `EditableScript.title` + `CustomCharacter.edition` | Also `titleZh` initially |
| `_meta.author` | `EditableScript.author` | |
| `_meta.version` | `EditableScript.version` + `CustomCharacter.version` | Default `"1.0"` if absent |
| `_meta.logo` | `EditableScript.logoUrl` + `EditableScript.meta.logo` | URL, lazy-loaded |
| `_meta.almanac` | `EditableScript.almanacUrl` | |
| `char.id` | `CustomCharacter.id` = `"custom_" + normalizeId(char.id)` | Strip leading numeric prefix |
| `char.name` | `CustomCharacter.nameEn` | |
| `char.team` | `CustomCharacter.team` | `traveller` → `traveler` |
| `char.ability` | `CustomCharacter.abilityEn` | |
| `char.image` | `CustomCharacter.imageUrl` | External URL, never base64 at import |
| `char.firstNight` | `CustomCharacter.firstNight` + `nightOrderMap.firstNight[id]` | 0 = does not wake |
| `char.firstNightReminder` | `CustomCharacter.firstNightReminder` | |
| `char.otherNight` | `CustomCharacter.otherNight` + `nightOrderMap.otherNight[id]` | 0 = does not wake |
| `char.otherNightReminder` | `CustomCharacter.otherNightReminder` | |
| `char.reminders` | `CustomCharacter.reminders` | Tokens placed on OTHER seats |
| `char.remindersGlobal` | `CustomCharacter.remindersGlobal` | Tokens on ALL seats |
| `char.jinxes` | `CustomCharacter.jinxes` | Forwarded as-is |

### 2.3 Id Normalization

Bloodstar ids often have leading numeric prefixes (e.g. `"1_silksong"`). Normalization:

```
normalizeId("1_silksong")   → "silksong"
normalizeId("silkweaver")   → "silkweaver"
normalizeId("42_dark_muse") → "dark_muse"
```

Final stored id: `"custom_" + normalizeId(rawId)`.

Collision within the same import (two characters normalize to same id): append `_2`, `_3`, etc.

Collision with existing catalog character: `ImportConflict` with `kind = 'id-clash'`, default resolution `'skip'`.

Collision with existing `CustomCharacter` of same version: silently skip (no change needed).

Collision with existing `CustomCharacter` of different version: `ImportConflict` with `kind = 'update'` — user reviews diff and chooses `'update'` or `'skip'`.

### 2.4 Script `characters` Array Construction

```
EditableScript.characters = [
  ...catalog_ids_referenced_in_script,      // unchanged, e.g. "poisoner"
  ...custom_ids_from_this_import,           // e.g. "custom_silkweaver"
]
```

Characters resolved as `'skip'` in conflict resolution are excluded.

---

## 3. Night Order Override Pipeline

### 3.1 Priority Hierarchy

```
1. EditableScript.nightOrderOverride[charId]   — highest (per-script, user-editable)
2. CustomCharacter.firstNight / otherNight     — character default (from import)
3. catalog night-order.json                    — global fallback for catalog chars
```

### 3.2 Population at Import

When a bloodstar script is imported, ALL characters with non-zero `firstNight` or `otherNight` populate both:
- `CustomCharacter.firstNight` / `.otherNight` (stored on the character record)
- `EditableScript.nightOrderOverride.firstNight[customId]` / `.otherNight[customId]`

This means:
- The character carries its "default" position for any script it appears in.
- The script carries an explicit override map so the exact bloodstar night order is preserved even if other scripts use the same character differently.

### 3.3 `buildNightOrderForScript`

New function in `catalog.ts` — replaces direct `buildEffectiveNightOrder` calls in the ST Helper when a script is active.

```typescript
// src/catalog.ts

export function buildNightOrderForScript(
  script: EditableScript,
  allCustomChars: CustomCharacter[],
): NightOrderData {
  const scriptCharIds = new Set(script.characters)
  const override = script.nightOrderOverride

  // Start from catalog night-order.json, keep only chars in this script
  const catalogFirst = (nightOrder.first_night ?? []).filter((id) => scriptCharIds.has(id))
  const catalogOther = (nightOrder.other_nights ?? []).filter((id) => scriptCharIds.has(id))

  // Build effective position map for custom characters
  const customInScript = allCustomChars.filter((c) => scriptCharIds.has(c.id))

  // Merge: script override > character default
  const charFirstNight = (charId: string, char?: CustomCharacter): number => {
    const scriptVal = override?.firstNight[charId]
    if (scriptVal !== undefined) return scriptVal
    return char?.firstNight ?? 0
  }
  const charOtherNight = (charId: string, char?: CustomCharacter): number => {
    const scriptVal = override?.otherNight[charId]
    if (scriptVal !== undefined) return scriptVal
    return char?.otherNight ?? 0
  }

  const customFirst = customInScript
    .map((c) => ({ id: c.id, pos: charFirstNight(c.id, c) }))
    .filter((x) => x.pos > 0)
    .sort((a, b) => a.pos - b.pos)
    .map((x) => x.id)

  const customOther = customInScript
    .map((c) => ({ id: c.id, pos: charOtherNight(c.id, c) }))
    .filter((x) => x.pos > 0)
    .sort((a, b) => a.pos - b.pos)
    .map((x) => x.id)

  // Splice custom chars into catalog order using their position as insertion index
  const first = [...catalogFirst]
  const other = [...catalogOther]

  for (const c of customInScript) {
    const fp = charFirstNight(c.id, c)
    if (fp > 0 && !first.includes(c.id)) {
      first.splice(Math.min(fp - 1, first.length), 0, c.id)
    }
    const op = charOtherNight(c.id, c)
    if (op > 0 && !other.includes(c.id)) {
      other.splice(Math.min(op - 1, other.length), 0, c.id)
    }
  }

  return { first_night: first, other_nights: other }
}
```

### 3.4 User-Editable Night Order (future)

The ST Helper "Night Order" view (or Script Detail view) exposes a drag-to-reorder list per script. Saves back to `EditableScript.nightOrderOverride`. Not in scope for initial import implementation but the data model supports it now.

---

## 4. Script Parser Logic

### 4.1 Module

**File:** `src/lib/parseBloodstar.ts`  
No React dependencies. Pure TypeScript. Testable in isolation.

### 4.2 `parseBloodstarJson`

```typescript
// src/lib/parseBloodstar.ts

import type {
  ImportedScriptPreview, ParsedImportCharacter, ImportConflict, Team,
} from '../types'

const VALID_TEAMS = new Set([
  'townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'traveller', 'fabled', 'loric',
])

/**
 * Parse a bloodstar.xyz / SE JSON array into ImportedScriptPreview.
 *
 * @param json          Raw parsed JSON — must be an array.
 * @param sourceRef     Original filename or URL (for provenance).
 * @param importSource  How data was obtained.
 * @param existingCatalogIds    Set of ids in the built-in catalog.
 * @param existingCustomChars   Map of custom_ id → stored CustomCharacter.
 */
export function parseBloodstarJson(
  json: unknown,
  sourceRef: string,
  importSource: 'bloodstar' | 'file' | 'url',
  existingCatalogIds: Set<string>,
  existingCustomChars: Map<string, { version?: string; abilityEn: string }>,
): ImportedScriptPreview {
  if (!Array.isArray(json)) throw new Error('Script JSON must be an array')

  // ── _meta ────────────────────────────────────────────────────────────────
  const metaRaw = json.find(
    (e): e is Record<string, unknown> =>
      typeof e === 'object' && e !== null && (e as any).id === '_meta',
  ) as Record<string, unknown> | undefined

  const title      = str(metaRaw?.name) ?? sourceRef
  const author     = str(metaRaw?.author) ?? ''
  const version    = str(metaRaw?.version) ?? '1.0'
  const logoUrl    = str(metaRaw?.logo)
  const almanacUrl = str(metaRaw?.almanac)

  // ── Characters ───────────────────────────────────────────────────────────
  const rawChars = json.filter(
    (e): e is Record<string, unknown> =>
      typeof e === 'object' && e !== null && typeof (e as any).id === 'string' && (e as any).id !== '_meta',
  ) as Record<string, unknown>[]

  const characters: ParsedImportCharacter[] = []
  const seenNormalized = new Set<string>()

  const nightOrderMap: { firstNight: Record<string, number>; otherNight: Record<string, number> } = {
    firstNight: {},
    otherNight: {},
  }

  for (const raw of rawChars) {
    const rawId  = raw.id as string
    const baseId = normalizeCharacterId(rawId)
    const id     = seenNormalized.has(baseId) ? `${baseId}_${seenNormalized.size}` : baseId
    seenNormalized.add(id)

    const team = resolveTeam(raw.team)
    if (!team) continue

    const fn = parsePos(raw.firstNight)
    const on = parsePos(raw.otherNight)

    if (fn > 0) nightOrderMap.firstNight[id] = fn
    if (on > 0) nightOrderMap.otherNight[id] = on

    characters.push({
      id,
      name:    str(raw.name) ?? id,
      team,
      ability: str(raw.ability) ?? '',
      imageUrl: str(raw.image),
      reminders:       parseStrArr(raw.reminders),
      remindersGlobal: parseStrArr(raw.remindersGlobal),
      firstNight:           fn > 0 ? fn : undefined,
      firstNightReminder:   str(raw.firstNightReminder),
      otherNight:           on > 0 ? on : undefined,
      otherNightReminder:   str(raw.otherNightReminder),
    })
  }

  // ── Night order sorted arrays ─────────────────────────────────────────────
  const firstNightOrder = characters
    .filter((c) => (nightOrderMap.firstNight[c.id] ?? 0) > 0)
    .sort((a, b) => nightOrderMap.firstNight[a.id] - nightOrderMap.firstNight[b.id])
    .map((c) => c.id)

  const otherNightOrder = characters
    .filter((c) => (nightOrderMap.otherNight[c.id] ?? 0) > 0)
    .sort((a, b) => nightOrderMap.otherNight[a.id] - nightOrderMap.otherNight[b.id])
    .map((c) => c.id)

  // ── Conflict detection ────────────────────────────────────────────────────
  const conflicts: ImportConflict[] = []
  const customPrefix = (id: string) => `custom_${id}`

  for (const c of characters) {
    if (existingCatalogIds.has(c.id)) {
      conflicts.push({ id: c.id, existsIn: 'catalog', kind: 'id-clash', resolution: 'skip' })
      continue
    }
    const storedCustom = existingCustomChars.get(customPrefix(c.id))
    if (storedCustom) {
      if (storedCustom.version !== version) {
        // Different version → offer update with diff
        conflicts.push({
          id: c.id,
          existsIn: 'customChars',
          kind: 'update',
          storedVersion:   storedCustom.version ?? '?',
          incomingVersion: version,
          storedAbility:   storedCustom.abilityEn,
          resolution: 'update',  // default: accept update
        })
      }
      // Same version: no conflict — will be silently skipped in applyImportResolutions
    }
  }

  return {
    title, author, version, logoUrl, almanacUrl,
    sourceRef, importSource,
    characters, firstNightOrder, otherNightOrder, nightOrderMap,
    conflicts,
  }
}
```

### 4.3 Helpers

```typescript
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined
}

function parsePos(v: unknown): number {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function parseStrArr(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const r = v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
  return r.length > 0 ? r : undefined
}

function normalizeCharacterId(raw: string): string {
  // Strip leading "42_" numeric prefix
  const stripped = raw.replace(/^\d+_/, '')
  return slugify(stripped) || slugify(raw)
}

function resolveTeam(raw: unknown): Team | null {
  if (typeof raw !== 'string') return null
  const t = raw.toLowerCase()
  const mapped = t === 'traveller' ? 'traveler' : t
  return VALID_TEAMS.has(mapped) ? (mapped as Team) : null
}
```

### 4.4 `applyImportResolutions`

Called when the user clicks "Import" in Step 3 of the dialog.

```typescript
// src/lib/parseBloodstar.ts

import type { CustomCharacter, CustomCharacterRevision, EditableScript, ImportResolution } from '../types'

export function applyImportResolutions(
  preview: ImportedScriptPreview,
  resolutions: ImportResolution[],
  existingCustomChars: Map<string, CustomCharacter>,
  targetFolderId?: string,
): {
  /** CustomCharacter records to upsert into BOTC_CUSTOM_CHARACTERS */
  upsertCustomChars: CustomCharacter[]
  /** New EditableScript to add to user scripts */
  newScript: Omit<EditableScript, 'sourceFile'>
} {
  const resMap = new Map(resolutions.map((r) => [r.characterId, r]))
  const upsertCustomChars: CustomCharacter[] = []
  const scriptCharIds: string[] = []

  for (const parsed of preview.characters) {
    const res = resMap.get(parsed.id)
    const action = res?.action ?? 'import'

    if (action === 'skip') continue

    const customId = res?.resolvedId ?? `custom_${parsed.id}`
    scriptCharIds.push(customId)

    if (action === 'update') {
      // Update existing character: snapshot current state into revisionHistory
      const existing = existingCustomChars.get(customId)
      if (existing) {
        const snapshot: CustomCharacterRevision = {
          version:   existing.version ?? '?',
          savedAt:   Date.now(),
          abilityEn: existing.abilityEn,
          abilityZh: existing.abilityZh,
          nameEn:    existing.nameEn,
          nameZh:    existing.nameZh,
          firstNight: existing.firstNight,
          otherNight: existing.otherNight,
        }
        upsertCustomChars.push({
          ...existing,
          abilityEn:  parsed.ability,
          nameEn:     parsed.name,
          imageUrl:   parsed.imageUrl ?? existing.imageUrl,
          firstNight: parsed.firstNight,
          otherNight: parsed.otherNight,
          firstNightReminder: parsed.firstNightReminder,
          otherNightReminder: parsed.otherNightReminder,
          reminders:       parsed.reminders,
          remindersGlobal: parsed.remindersGlobal,
          version:    preview.version,
          updatedAt:  Date.now(),
          revisionHistory: [...(existing.revisionHistory ?? []), snapshot],
        })
        continue
      }
      // Fallthrough to 'import' if existing not found (stale resolution)
    }

    // action === 'import' (new character)
    upsertCustomChars.push({
      id:             customId,
      author:         preview.author || 'imported',
      team:           parsed.team,
      edition:        preview.title,
      nameEn:         parsed.name,
      abilityEn:      parsed.ability,
      imageUrl:       parsed.imageUrl,
      firstNight:     parsed.firstNight,
      firstNightReminder: parsed.firstNightReminder,
      otherNight:     parsed.otherNight,
      otherNightReminder: parsed.otherNightReminder,
      reminders:       parsed.reminders,
      remindersGlobal: parsed.remindersGlobal,
      version:         preview.version,
      sourceScriptSlug: slugify(preview.title),
      revisionHistory: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  }

  const slug = slugify(preview.title) || `imported-${Date.now()}`

  const newScript: Omit<EditableScript, 'sourceFile'> = {
    slug,
    title:   preview.title,
    titleZh: preview.title,
    author:  preview.author,
    edition: 'custom',
    version: preview.version,
    characters: scriptCharIds,
    meta: { id: '_meta', name: preview.title, author: preview.author },
    customCharacters: [],
    tags: ['imported'],
    importSource: preview.importSource,
    importUrl:    preview.importSource !== 'file' ? preview.sourceRef : undefined,
    logoUrl:      preview.logoUrl,
    almanacUrl:   preview.almanacUrl,
    nightOrderOverride: {
      firstNight: Object.fromEntries(
        Object.entries(preview.nightOrderMap.firstNight).map(([id, pos]) => [`custom_${id}`, pos])
      ),
      otherNight: Object.fromEntries(
        Object.entries(preview.nightOrderMap.otherNight).map(([id, pos]) => [`custom_${id}`, pos])
      ),
    },
    folderId: targetFolderId,
  }

  return { upsertCustomChars, newScript }
}
```

### 4.5 URL Fetch Wrapper

```typescript
export async function parseScriptUrl(
  url: string,
  existingCatalogIds: Set<string>,
  existingCustomChars: Map<string, { version?: string; abilityEn: string }>,
): Promise<ImportedScriptPreview> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
  let json: unknown
  try { json = await res.json() }
  catch { throw new Error('Response is not valid JSON') }
  return parseBloodstarJson(json, url, 'url', existingCatalogIds, existingCustomChars)
}
```

---

## 5. Scripts Tab UI Redesign

### 5.1 Problem Statement

Current Scripts tab: flat list, inline edit forms. Works at ≤20 scripts; breaks at 100+. Redesign: two-panel layout, search/filter, card grid, separated detail view.

### 5.2 Desktop Layout (two-panel)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Scripts                                                   [+ Import Script] │
├──────────────────────┬──────────────────────────────────────────────────────┤
│  LEFT PANEL (240px)  │  RIGHT PANEL (flex)                                  │
│                      │                                                       │
│  [🔍 Search...]      │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│                      │  │ CARD     │ │ CARD     │ │ CARD     │             │
│  ── Folders ──  [+]  │  │ logo     │ │ logo     │ │ logo     │             │
│  ▼ Homebrew (3) [⋮]  │  │ Title    │ │ Title    │ │ Title    │             │
│    Silk Songs        │  │ Author   │ │ Author   │ │ Author   │             │
│    Plague Doctors    │  │ v1.3     │ │ v2.0     │ │          │             │
│  ▶ Favourites (2)[⋮] │  │ T/O/M/D  │ │ T/O/M/D  │ │ T/O/M/D  │             │
│                      │  └──────────┘ └──────────┘ └──────────┘             │
│  Uncategorized (5)   │                                                       │
│    Trouble Brewing   │  ┌──────────┐ ┌──────────┐                          │
│    Bad Moon Rising   │  │ ↑ UPDATE  │ │ CARD     │                          │
│                      │  │ CARD     │ │ ...      │                           │
│  ── Filters ──       │  └──────────┘ └──────────┘                          │
│  Edition: All|Off    │                                                       │
│  Custom|Imported     │                                                       │
│  Tags: ★ □ WIP       │                                                       │
│                      │                                                       │
│  [+ Import Script]   │                                                       │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

### 5.3 Mobile Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Scripts                                      [☰ Filter]  [+ Import]        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ▼ Homebrew (3)                               [⋮]                           │
│  ┌──────────┐ ┌──────────┐                                                  │
│  │ Silk…    │ │ Plague…  │                                                   │
│  └──────────┘ └──────────┘                                                  │
│  Uncategorized (5)                                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                                    │
│  │ TB       │ │ BMR      │ │ SNV      │                                     │
│  └──────────┘ └──────────┘ └──────────┘                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Script Card

| Element | Source | Notes |
|---------|--------|-------|
| Logo / thumbnail | `script.logoUrl` or `script.meta.logo` | Fallback: generated avatar from title initial |
| Title | `script.title` / `script.titleZh` | Language-aware |
| Author | `script.author` | Truncated at 24 chars |
| Version chip | `script.version` | `v1.3` — shown only if present; amber when update available |
| Team counts | Characters by team | `T13 / O4 / M2 / D1` |
| Team distribution dots | Count by team | Colored: T=blue O=teal M=orange D=red |
| Edition badge | `script.edition` | tb / snv / bmr / custom / imported |
| ↑ UPDATE badge | When re-import detects new version | Amber chip; click opens re-import dialog |
| Favorite star | `script.tags?.includes('favorite')` | Toggleable |

### 5.5 Script Detail View

```
ScriptDetailView
├── Header
│   ├── Logo (if logoUrl)
│   ├── Title + ★ + version chip (+ "Update available" link)
│   ├── Author, Edition badge
│   └── Tags (editable chips for user scripts)
├── CharacterList
│   ├── Grouped by team
│   └── Each: icon + name + ability tooltip + version chip (if custom char)
├── NightOrderPreview
│   ├── First Night (sorted by effective position)
│   └── Other Nights
│       Row: position | icon | name | reminder text
├── JinxList (if active jinxes)
└── ActionBar
    ├── Edit (opens EditScriptDialog)
    ├── Export JSON
    ├── Print / PDF
    ├── Almanac link (if almanacUrl)
    ├── Re-import / Check for updates (if importUrl present)
    └── Delete (confirmation for user scripts; disabled for built-ins)
```

### 5.6 New Component Files

| File | Purpose |
|------|---------|
| `src/components/ScriptsTab/ScriptsTabLayout.tsx` | Two-panel container, responsive |
| `src/components/ScriptsTab/ScriptCard.tsx` | Grid card |
| `src/components/ScriptsTab/ScriptCardGrid.tsx` | Filtered/sorted card grid |
| `src/components/ScriptsTab/ScriptsLeftPanel.tsx` | Folders + search + filters panel |
| `src/components/ScriptsTab/ScriptFolderRow.tsx` | Folder header: chevron, name, count, ⋮ menu |
| `src/components/ScriptsTab/ScriptDetailView.tsx` | Right-panel detail |
| `src/components/ScriptsTab/NightOrderPreview.tsx` | Two-column night order table |
| `src/components/ScriptsTab/ImportScriptDialog.tsx` | 3-step import flow |
| `src/components/ScriptsTab/CharacterVersionChip.tsx` | Version badge with update indicator |
| `src/lib/parseBloodstar.ts` | Parser (no React) |

---

## 6. Script Folders

### 6.1 Left Panel Structure

```
LEFT PANEL
│
│  [🔍 Search...]
│
│  ── Folders ──────────────────────────  [+ New Folder]
│
│  ▼  Homebrew (3)                              [⋮]
│  │   ├ Silk Songs                              [⋮]
│  │   ├ Plague Doctors                          [⋮]
│  │   └ The Crimson Tides                       [⋮]
│
│  ▶  Official Favourites (2)                   [⋮]   ← collapsed
│
│  ▼  Uncategorized (5)                              ← no [⋮], always shown
│      ├ Trouble Brewing                         [⋮]
│      ├ Bad Moon Rising                         [⋮]
│      └ …
│
│  ── Filters ──────────────────────────
│  Edition: All | Official | Custom | Imported
│  Tags: ★ Favorites  □ WIP  □ Experimental
│
│  [+ Import Script]
```

### 6.2 Folder CRUD State (`App.tsx`)

```typescript
const [scriptFolders, setScriptFolders] = useState<ScriptFolder[]>(() => {
  try {
    return JSON.parse(localStorage.getItem(SCRIPT_FOLDERS_KEY) ?? '[]') as ScriptFolder[]
  } catch { return [] }
})

useEffect(() => {
  localStorage.setItem(SCRIPT_FOLDERS_KEY, JSON.stringify(scriptFolders))
}, [scriptFolders])
```

**Handler signatures:**

```typescript
createFolder(name: string): ScriptFolder
renameFolder(id: string, name: string): void
deleteFolder(id: string): void        // member scripts → folderId = undefined
moveFolderOrder(id: string, newOrder: number): void
toggleFolderCollapsed(id: string): void
setScriptFolder(slug: string, folderId: string | null): void
```

### 6.3 Rendering Logic

```typescript
const scriptsByFolder = useMemo(() => {
  const map = new Map<string | null, EditableScript[]>([[null, []]])
  for (const f of sortedFolders) map.set(f.id, [])
  for (const s of filteredScripts) {
    const key = s.folderId && map.has(s.folderId) ? s.folderId : null
    map.get(key)!.push(s)
  }
  return map
}, [filteredScripts, sortedFolders])
// Render: sortedFolders first (hide if 0 results during search), uncategorized last
```

### 6.4 Script Row Context Menu (`[⋮]`)

```
Move to folder
  ├ Homebrew     ← checkmark if current folder
  ├ Favourites
  ├ ──────────
  └ Remove from folder

─────────────
Duplicate
Delete
```

### 6.5 Import: "Add to folder" in Step 3

Dropdown in Step 3: `[ None (Uncategorized) ▼ ]` with all folder names + "Create new…" inline input. Selected folder id written to `newScript.folderId` in `applyImportResolutions`.

### 6.6 Search / Filter Interaction

- Folder grouping preserved during search.
- Folders with **zero matching scripts** are hidden entirely.
- `folder.collapsed` ignored during active search — all matching scripts shown.

---

## 7. Script Import Flow (UI)

### 7.1 Entry Points

1. "Import Script" button in left panel.
2. Drag-and-drop `.json` anywhere on the Scripts tab surface (drop overlay on `dragenter`).

### 7.2 Step Overview

```
Step 1: Source  →  Step 2: Review + Conflicts  →  Step 3: Confirm
   [Back]              [Back]                          [Import]
```

Dialog: MUI `Dialog`, fullScreen on mobile, `maxWidth="md"` on desktop.

### 7.3 Step 1 — Source

Three tabs: **URL** | **Upload File** | **Paste JSON**

```
Tab A — URL
  [https://bloodstar.xyz/prod/myscript.json    ] [Preview ↓]

Tab B — Upload
  [ Drag .json here, or click to browse ]

Tab C — Paste JSON
  [ textarea ]                              [Preview ↓]
```

"Preview" button → parse → on success advance to Step 2. On error → inline error below input. Loading state: CircularProgress replaces button.

### 7.4 Step 2 — Review + Conflicts

```
Script: "Silk Songs" v1.3            Author: Jane Doe
20 characters  ·  T:13  O:4  M:2  D:1

── Night Order Preview ─────────────────────────────────
First Night          │  Other Nights
1. [icon] Beekeeper  │  1. [icon] Beekeeper
2. [icon] Wasp       │  2. [icon] Parasite
…                    │  …

── Characters ──────────────────────────────────────────
Townsfolk (13)
[icon] Silkweaver     Townsfolk  — ability text —
[icon] …

── Updates (1) — existing custom chars with new version ─
↑  "custom_silkweaver"  v1.0 → v1.3
   Old: "Each night*, you learn X."
   New: "Each night*, you learn X or Y."
   [Update ▼]  options: Update | Skip

── ID Conflicts (2) — clash with catalog ────────────────
⚠  "poisoner" already in catalog
   [Skip ▼]  options: Skip | Keep both (imports as custom_poisoner_imported)
⚠  "spy" already in catalog
   [Skip ▼]

☑  Add characters to my character library

[← Back]                              [Next: Confirm →]
```

**Update section** (new): shows a before/after diff of `abilityEn` for each character with `kind = 'update'` conflict. Default resolution is `'update'`; user can switch to `'skip'`.

**Conflict section** (id-clash with catalog): default `'skip'`; `'keepBoth'` imports with `_imported` suffix.

### 7.5 Step 3 — Confirm

```
Ready to Import

Script:       Silk Songs  v1.3
Author:       Jane Doe
New chars:    17 will be created
Updated:      1 character updated (revision saved)
Skipped:      2 (catalog conflicts)
Folder:       [ None (Uncategorized) ▼ ]

Skipped:
  · poisoner  (catalog clash — skip)
  · spy       (catalog clash — skip)

[← Back]                                       [Import]
```

On "Import":
1. `applyImportResolutions(...)` → `{ upsertCustomChars, newScript }`
2. Upsert into `BOTC_CUSTOM_CHARACTERS` (add new + update existing with snapshots).
3. Append `newScript` to user scripts state.
4. Close dialog. Select newly imported script. Show Snackbar: "Silk Songs imported (17 characters, 1 updated)".

### 7.6 Re-import / Update Check

Script Detail ActionBar → "Check for updates" button (shown when `script.importUrl` is set).

Flow:
1. Fetch `script.importUrl` → parse.
2. Compare `preview.version` vs `script.version`.
3. If same → Snackbar "Already up to date (v1.3)".
4. If newer → open ImportScriptDialog at **Step 2** pre-populated with update conflicts only. Step 1 is skipped.
5. On confirm → update `EditableScript.version`, upsert changed characters.

---

## 8. Character Editor — Reminder Token Fields

### 8.1 Current State

`CustomCharDialog.tsx` already carries `reminders: []` in the draft state but **renders no UI for it**. `remindersGlobal` is absent from the draft entirely. Both fields need chip-based token editors.

### 8.2 `Draft` Type Fix

```typescript
// CustomCharDialog.tsx

type Draft = Omit<CustomCharacter, 'id' | 'createdAt' | 'updatedAt'>

const BLANK: Draft = {
  author: '',
  team: 'townsfolk',
  nameEn: '',
  nameZh: '',
  abilityEn: '',
  abilityZh: '',
  icon: undefined,
  edition: 'custom',
  firstNight: undefined,
  otherNight: undefined,
  firstNightReminder: '',
  otherNightReminder: '',
  reminders: [],
  remindersGlobal: [],   // ← add
}
```

When loading an existing character into the draft:

```typescript
reminders:       editingChar.reminders       ?? [],
remindersGlobal: editingChar.remindersGlobal ?? [],
```

### 8.3 Token Chip Editor — `ReminderTokenEditor`

Reusable sub-component used for both `reminders` and `remindersGlobal`.

```
┌──────────────────────────────────────────────────────────┐
│  Reminder tokens (placed on other seats)                 │
│                                                          │
│  [Poisoned ×]  [Drunk ×]                                 │
│                                                          │
│  [ Type token name…      ] [+ Add]                       │
└──────────────────────────────────────────────────────────┘
```

- Chips: `variant="outlined"`, `onDelete` removes the token from the array.
- Input: `TextField size="small"`, `onKeyDown` → Enter adds token (trims, deduplicates, clears input).
- `[+ Add]` button: same action as Enter; disabled when input is empty.
- Empty state: just the input row (no chips shown).
- No max — any number of tokens allowed.

```typescript
// src/components/ReminderTokenEditor.tsx

interface Props {
  label: string
  hint?: string
  tokens: string[]
  onChange: (tokens: string[]) => void
}

export function ReminderTokenEditor({ label, hint, tokens, onChange }: Props) {
  const [input, setInput] = useState('')

  const addToken = () => {
    const t = input.trim()
    if (!t || tokens.includes(t)) { setInput(''); return }
    onChange([...tokens, t])
    setInput('')
  }

  const removeToken = (t: string) => onChange(tokens.filter((x) => x !== t))

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.75, fontStyle: 'italic' }}>
          {hint}
        </Typography>
      )}
      {tokens.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {tokens.map((t) => (
            <Chip key={t} label={t} size="small" variant="outlined" onDelete={() => removeToken(t)} />
          ))}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addToken() } }}
          placeholder={tokens.length === 0 ? 'e.g. Poisoned' : 'Add another…'}
          sx={{ flex: 1 }}
        />
        <Button size="small" variant="outlined" onClick={addToken} disabled={!input.trim()}>
          Add
        </Button>
      </Box>
    </Box>
  )
}
```

### 8.4 Integration into `CustomCharDialog`

Place the two `ReminderTokenEditor` instances **after the night-order reminder TextFields** and before the Save/Cancel bar:

```
── Night Order ──────────────────────────────────
  First Night wake position
  Other Nights wake position
  [First Night reminder text] [Other Night reminder text]

── Reminder Tokens ─────────────────────────────
  Reminder tokens (placed on other seats)     ← draft.reminders
  hint: "Tokens this character places on other players. Example: Poisoner → 'Poisoned'"
  [Poisoned ×]  [ Type token name…  ] [+ Add]

  Global reminder tokens (all seats)          ← draft.remindersGlobal
  hint: "Tokens available on every seat. Example: Minion info, Demon info"
  [ Type token name…  ] [+ Add]

────────────────────────────────────────────────
  [Cancel]                              [Save]
```

In `CustomCharDialog`:

```typescript
// In DialogContent, after the night-order section:

<Divider />
<ReminderTokenEditor
  label={t('reminder_tokens')}
  hint={t('reminder_tokens_hint')}
  tokens={draft.reminders ?? []}
  onChange={(v) => setDraft((d) => ({ ...d, reminders: v }))}
/>
<ReminderTokenEditor
  label={t('reminder_tokens_global')}
  hint={t('reminder_tokens_global_hint')}
  tokens={draft.remindersGlobal ?? []}
  onChange={(v) => setDraft((d) => ({ ...d, remindersGlobal: v }))}
/>
```

### 8.5 i18n Keys

Add to both `en.json` and `zh.json` locale files:

| Key | EN | ZH |
|-----|----|----|
| `reminder_tokens` | Reminder tokens (other seats) | 提示标记（其他座位） |
| `reminder_tokens_hint` | Tokens this character places on other players | 此角色放置在其他玩家座位上的标记 |
| `reminder_tokens_global` | Global reminder tokens (all seats) | 全局提示标记（所有座位） |
| `reminder_tokens_global_hint` | Tokens available on every seat | 在所有座位上均可使用的标记 |

### 8.6 All Characters — Built-in vs Custom

The reminder token editor is only in `CustomCharDialog` (custom characters). Built-in catalog characters (`CharacterEntry`) already have `reminders` / `remindersGlobal` defined in `ScriptCharacterItem` on the script itself; those are not editable through this dialog.

However, a future enhancement could surface built-in character reminder tokens as read-only chip display in the character detail view on the Characters tab.

---

## 9. ST Helper Night Phase — Reminder Tags

### 9.1 Current Tag System

Each `StorytellerSeat` has:
- `customTags: string[]` — user-typed free-form tags
- `stTags: string[]` — system tags (Dead, No Vote, etc.)

### 9.2 Reminder Token Source

At game start, ST Helper resolves the active character list. For each character with `reminders` or `remindersGlobal`, these surface as predefined chip suggestions on seat tag panels.

| Field | Shown on |
|-------|---------|
| `reminders[]` | All seats **except** the seat assigned this character |
| `remindersGlobal[]` | All seats including the character's own seat |

### 9.3 Tag Panel UI

```
┌──────────────────────────────────────────────┐
│  Seat 4 — Alice (Poisoner)                   │
│                                               │
│  Applied:  [Dead ×]  [Poisoned ×]            │
│                                               │
│  Reminders from script:                       │
│  [Poisoned]   ← outlined chip, tap to apply  │
│                                               │
│  Custom tags:  [__________ + ]               │
└──────────────────────────────────────────────┘
```

Already-applied tokens are hidden from suggestions. Suggestions come from `getSuggestedReminders(targetSeat, allSeats, getCustomChar)`.

### 9.4 `getSuggestedReminders`

```typescript
function getSuggestedReminders(
  targetSeat: number,
  allSeats: StorytellerSeat[],
  getCustomChar: (id: string) => CustomCharacter | undefined,
): string[] {
  const suggestions = new Set<string>()
  for (const seat of allSeats) {
    if (!seat.characterId) continue
    const char = getCustomChar(seat.characterId)
    if (!char) continue
    if (seat.seat !== targetSeat && char.reminders)
      for (const t of char.reminders) suggestions.add(t)
    if (char.remindersGlobal)
      for (const t of char.remindersGlobal) suggestions.add(t)
  }
  return [...suggestions]
}
```

---

## 10. Storage & Migration

### 10.1 Backward Compatibility

All new fields on `CustomCharacter` and `EditableScript` are optional. Existing stored data loads without migration — TypeScript treats missing fields as `undefined`.

### 10.2 Storage Keys

| Key | Content | Changed? |
|-----|---------|----------|
| `BOTC_CUSTOM_CHARACTERS` | `CustomCharacter[]` | Extended — `remindersGlobal?`, `version?`, `sourceScriptSlug?`, `revisionHistory?` |
| `USER_SCRIPTS_KEY` | `EditableScript[]` | Extended — `folderId?`, `nightOrderOverride?`, `version?`, etc. |
| `BOTC_SCRIPT_FOLDERS` | `ScriptFolder[]` | **New** |
| `BOTC_REVISION_OVERRIDES` | Unaffected | — |
| `BOTC_JINX_OVERRIDES` | Unaffected | — |
| `BOTC_CHAR_PACK_OVERRIDES` | Unaffected | — |
| `BOTC_NIGHT_ORDER_OVERRIDES` | Unaffected | — |

`BOTC_SCRIPT_FOLDERS` constant added to `src/components/StorytellerSub/constants.ts`.

### 10.3 `getIconForCharacter` Extension

```typescript
export function getIconForCharacter(id: string): string | undefined {
  const custom = _customCharRegistry.get(id)
  if (custom?.icon)     return custom.icon      // base64 / data URL — highest priority
  if (custom?.imageUrl) return custom.imageUrl  // external URL — second
  // ... existing bundled icon lookup
}
```

### 10.4 Estimated Storage Impact

20 custom characters with `imageUrl` (URL string, ~80 chars) vs base64 (~6 KB each):
- URL strategy: ~10 KB per script
- Base64 strategy: ~120 KB per script

10 imported scripts: ~100 KB vs ~1.2 MB. URL-only strategy keeps well under 5–10 MB browser limit.

### 10.5 Character `revisionHistory` Size

Each `CustomCharacterRevision` snapshot ~300 bytes (strings only, no images). 10 revisions per character = ~3 KB — negligible.

---

---

## 11. Implementation Phases

**Strategy:** UI changes first. All new type fields are `optional` — existing stored data loads unchanged throughout every phase. Core type extensions and the parser are added only when the UI that needs them is ready.

Each phase is independently shippable — the app stays functional after every phase lands.

---

### Phase 1 — Character Editor: Reminder Tokens

**Goal:** `CustomCharDialog` gets chip editors for `reminders` and `remindersGlobal`. Zero type breakage — `reminders` already exists on `CustomCharacter`; `remindersGlobal` is a new optional field.

**Type change (only):**

```typescript
// src/types.ts — add one optional field
remindersGlobal?: string[]   // on CustomCharacter
```

This is the only type change in this phase. No other model changes. Existing stored records that lack the field default to `undefined` / `[]` safely.

**Files:**

| File | Change |
|------|--------|
| `src/types.ts` | Add `remindersGlobal?: string[]` to `CustomCharacter` |
| `src/components/ReminderTokenEditor.tsx` | New reusable chip-input component (§8.3) |
| `src/components/CustomCharDialog.tsx` | Add `remindersGlobal: []` to `BLANK` + edit-load path; two `ReminderTokenEditor` instances after night-order section (§8.4) |
| `assets/locales/en.json` | 4 new i18n keys (§8.5) |
| `assets/locales/zh.json` | 4 new i18n keys (§8.5) |

**Checklist:**
- [ ] `reminders` chips render for existing chars that already have the field
- [ ] Adding / removing tokens persists after Save
- [ ] `remindersGlobal` absent from old records defaults to `[]` without error
- [ ] Enter adds token; duplicates rejected; empty input rejected
- [ ] EN and ZH label/hint strings render correctly
- [ ] `tsc -b` clean; existing tests pass

**Dependencies:** None — first phase.

---

### Phase 2 — Scripts Tab UI Shell

**Goal:** New two-panel `ScriptsTab` replaces the current flat `ScriptList`. Cards grid, detail view, left panel search/filter. No import, no folders yet — just a better-looking shell over existing data.

**Uses existing types as-is.** `version`, `logoUrl`, `edition` already on `EditableScript`. Night order uses existing `buildEffectiveNightOrder` for now (upgraded in Phase 6).

**Files:**

| File | Change |
|------|--------|
| `src/components/ScriptsTab/ScriptsTabLayout.tsx` | New — two-panel responsive container |
| `src/components/ScriptsTab/ScriptCard.tsx` | New — card: logo, title, author, team dots, edition badge, version chip (hidden when absent), favorite star |
| `src/components/ScriptsTab/ScriptCardGrid.tsx` | New — filtered/sorted card grid |
| `src/components/ScriptsTab/ScriptsLeftPanel.tsx` | New — search + edition filter + tag filter; folder section placeholder (renders "No folders yet") |
| `src/components/ScriptsTab/ScriptDetailView.tsx` | New — right-panel detail: header, character list grouped by team, night order preview, ActionBar |
| `src/components/ScriptsTab/NightOrderPreview.tsx` | New — two-column table; uses `buildEffectiveNightOrder` until Phase 6 |
| `src/App.tsx` | Replace `ScriptList` with `ScriptsTabLayout` in scripts tab slot |

**Checklist:**
- [ ] All existing scripts render as cards
- [ ] Search filters by title, author, character name
- [ ] Edition filter (All / Official / Custom / Imported) works
- [ ] Tag filter (Favorites / WIP / Experimental) works
- [ ] Card click → detail view (right panel desktop; full-panel push mobile)
- [ ] Night order preview renders for a known script
- [ ] Edit / Export / Print / Delete actions match current behavior exactly
- [ ] No regression: existing script create / edit / delete / import-json flows unaffected
- [ ] Mobile layout: filter in bottom sheet / drawer

**Dependencies:** Phase 1 complete (so `remindersGlobal` type is already in place for later phases).

---

### Phase 3 — Script Folders

**Goal:** Users create named folders and move scripts into them. Left panel shows collapsible folder sections.

**Type change (only):**

```typescript
// src/types.ts — two additions, both optional / new
folderId?: string          // on EditableScript
export type ScriptFolder = { id: string; name: string; order: number; collapsed?: boolean }
```

No other model changes. Existing scripts with no `folderId` silently appear in Uncategorized.

**Files:**

| File | Change |
|------|--------|
| `src/types.ts` | Add `folderId?` to `EditableScript`; add `ScriptFolder` type |
| `src/components/StorytellerSub/constants.ts` | Add `BOTC_SCRIPT_FOLDERS` storage key |
| `src/App.tsx` | Add `scriptFolders` state + CRUD handlers (§6.2) |
| `src/components/ScriptsTab/ScriptFolderRow.tsx` | New — folder header: chevron, name, count badge, ⋮ menu |
| `src/components/ScriptsTab/ScriptsLeftPanel.tsx` | Replace placeholder with real folder sections (§6.1) |
| `src/components/ScriptsTab/ScriptCard.tsx` | Add ⋮ context menu: Move to folder submenu, Duplicate, Delete |

**Checklist:**
- [ ] Create folder → inline rename → Enter saves
- [ ] Rename → double-click name or ⋮ → Rename
- [ ] Delete → confirmation → member scripts → Uncategorized
- [ ] Move to folder submenu: all folders listed; checkmark on current; "Remove from folder" at bottom
- [ ] Collapse/expand persisted in `BOTC_SCRIPT_FOLDERS`
- [ ] Folders with zero results hidden during active search
- [ ] Uncategorized always visible at bottom
- [ ] Refresh: folders and assignments restored from localStorage

**Dependencies:** Phase 2 (folder rows live inside the left panel shell).

---

### Phase 4 — Core Type Extensions & Catalog

**Goal:** Add all remaining new types (`CustomCharacterRevision`, versioning fields, `nightOrderOverride`, full import types) and extend `catalog.ts`. No visible UI change — preps for Phases 5–8.

**Files:**

| File | Change |
|------|--------|
| `src/types.ts` | Add `CustomCharacterRevision`; add `version?`, `sourceScriptSlug?`, `revisionHistory?`, `imageUrl?` to `CustomCharacter`; add `version?`, `nightOrderOverride?`, `importSource?`, `importUrl?`, `logoUrl?`, `almanacUrl?` to `EditableScript`; add transient types `ImportedScriptPreview`, `ParsedImportCharacter`, `ImportConflict`, `ImportResolution` |
| `src/catalog.ts` | Extend `getIconForCharacter`: check `imageUrl` fallback after `icon`; add `buildNightOrderForScript` (§3.3) |

**Checklist:**
- [ ] `tsc -b` clean; all new fields optional; zero runtime impact on existing data
- [ ] `getIconForCharacter` returns `imageUrl` when `icon` absent
- [ ] `buildNightOrderForScript`: script override > char default > catalog JSON (unit tests)
- [ ] Existing test suite passes unchanged

**Dependencies:** Phase 1 (so `remindersGlobal` already added; no double-touch).

---

### Phase 5 — Script Parser

**Goal:** `parseBloodstar.ts` complete and fully tested. No UI yet — just the pure TS module.

**Files:**

| File | Change |
|------|--------|
| `src/lib/parseBloodstar.ts` | New: `parseBloodstarJson`, `parseScriptUrl`, `applyImportResolutions`, helpers (§4) |
| `src/__tests__/parseBloodstar.test.ts` | New test file |

**Test cases:**
- [ ] `_meta` fields extracted: title, author, version, logo, almanac
- [ ] Numeric-prefix id normalized (`"1_silksong"` → `"custom_silksong"`)
- [ ] `traveller` → `traveler`
- [ ] `firstNight: 0` excluded from `firstNightOrder`
- [ ] `nightOrderMap` keys/values correct
- [ ] Catalog id clash → `kind: 'id-clash'`, default `'skip'`
- [ ] Same custom char + same version → no conflict
- [ ] Same custom char + different version → `kind: 'update'`, default `'update'`
- [ ] `applyImportResolutions` `'update'` action snapshots old state into `revisionHistory`
- [ ] `nightOrderOverride` keys prefixed `custom_` correctly
- [ ] Skipped chars excluded from `newScript.characters`
- [ ] Non-array input throws

**Dependencies:** Phase 4 (full import types).

---

### Phase 6 — Night Order Upgrade

**Goal:** `NightOrderPreview` and the ST Helper switch to `buildNightOrderForScript`, respecting per-script `nightOrderOverride`. Imported scripts immediately show correct night order.

**Files:**

| File | Change |
|------|--------|
| `src/components/ScriptsTab/NightOrderPreview.tsx` | Switch from `buildEffectiveNightOrder` to `buildNightOrderForScript` |
| ST Helper night-phase component | Use `buildNightOrderForScript(activeScript, customChars)` when a script is loaded |

**Checklist:**
- [ ] Scripts without `nightOrderOverride` behave identically to before
- [ ] Imported script with night positions shows characters in correct bloodstar order
- [ ] Script-level override wins over character default wins over catalog JSON
- [ ] Changing active script in ST Helper re-derives night order correctly

**Dependencies:** Phase 4 (`buildNightOrderForScript` in catalog.ts), Phase 5 (parser populates `nightOrderOverride` on imported scripts).

---

### Phase 7 — Script Import Dialog

**Goal:** Full 3-step import flow in the Scripts tab. Creates/updates custom characters from bloodstar JSON. Re-import / update check from ActionBar.

**Files:**

| File | Change |
|------|--------|
| `src/components/ScriptsTab/ImportScriptDialog.tsx` | New — 3-step MUI Dialog (§7.2–7.5) |
| `src/components/ScriptsTab/ScriptDetailView.tsx` | Add "Check for updates" to ActionBar (§7.6) |
| `src/components/ScriptsTab/ScriptsLeftPanel.tsx` | Wire `[+ Import Script]` button |
| `src/App.tsx` | Import handlers: upsert `BOTC_CUSTOM_CHARACTERS`, append script, select it |

**Checklist:**
- [ ] Step 1 URL: fetch + parse; error shown on failure
- [ ] Step 1 File: `FileReader` parses `.json`
- [ ] Step 1 Paste: raw JSON text parsed
- [ ] Step 2: night order preview renders
- [ ] Step 2: update conflicts show before/after ability diff
- [ ] Step 2: id-clash conflicts show Skip / Keep both
- [ ] Step 2: "Add to library" toggle
- [ ] Step 3: counts correct (new / updated / skipped); folder picker
- [ ] Confirm: chars upserted, script appended, dialog closes, script selected, Snackbar shown
- [ ] "Check for updates": same version → "Already up to date" Snackbar
- [ ] "Check for updates": newer version → opens at Step 2 pre-filled

**Dependencies:** Phase 3 (folders, so picker works), Phase 5 (parser), Phase 6 (night order correct on import).

---

### Phase 8 — Character Editor: Version Display

**Goal:** `CustomCharDialog` in edit mode shows version chip and collapsible revision history. Purely read-only display of data already stored by the import flow.

**Files:**

| File | Change |
|------|--------|
| `src/components/CharacterVersionChip.tsx` | New — `v1.3` chip, amber dot when update pending (prop-driven) |
| `src/components/CustomCharDialog.tsx` | Edit mode: version chip in title area; collapsible Revision history section |

```
┌─ Edit: Silkweaver  [v1.3] ──────────────────────────────┐
│  ...fields...                                            │
│  ▶ Revision history (2)                                  │
│    v1.0 — 2025-01-10 — "Each night*, you learn X."      │
│    v1.2 — 2025-06-03 — "Each night*, you learn X or Y." │
└──────────────────────────────────────────────────────────┘
```

**Checklist:**
- [ ] Version chip hidden when `version` undefined (pre-import chars)
- [ ] Revision history hidden when `revisionHistory` empty or absent
- [ ] Ability diff: snapshot `abilityEn` vs current `abilityEn`
- [ ] Timestamps formatted as locale date string

**Dependencies:** Phase 4 (types), Phase 7 (import populates `revisionHistory`).

---

### Phase 9 — ST Helper Reminder Tags

**Goal:** Night-phase seat tag panels show reminder token chip suggestions from `CustomCharacter.reminders` / `remindersGlobal`.

**Files:**

| File | Change |
|------|--------|
| `src/catalog.ts` | Add `getSuggestedReminders` (§9.4) |
| ST Helper seat tag panel | Add outlined chip suggestion section above free-form input (§9.3) |
| `src/components/StorytellerSub/useStoryteller.ts` | Expose `getSuggestedRemindersForSeat(seatNum)` derived function |

**Checklist:**
- [ ] `reminders` from char X appear on all seats except X's own seat
- [ ] `remindersGlobal` appear on all seats including own
- [ ] Already-applied tokens hidden from suggestions
- [ ] Tapping suggestion chip adds to `customTags`
- [ ] No suggestions shown when no chars have reminder fields
- [ ] Works for catalog chars (via `ScriptCharacterItem.reminders`) and custom chars

**Dependencies:** Phase 1 (`remindersGlobal` type), Phase 4 (full `CustomCharacter` type).

---

### Dependency Graph

```
Phase 1 (Char editor reminders — UI + 1 type field)
  │
  └─► Phase 2 (Scripts tab UI shell — pure UI, no new types)
        │
        └─► Phase 3 (Script folders — UI + 2 type additions)
              │
              └─► Phase 4 (Core type extensions + catalog functions) ← parallel-able with Phase 3
                    │
                    ├─► Phase 5 (Parser — pure TS)
                    │     │
                    │     └─► Phase 6 (Night order upgrade)
                    │           │
                    │           └─► Phase 7 (Import dialog) ◄── Phase 3 (folder picker)
                    │                 │
                    │                 └─► Phase 8 (Version display in char dialog)
                    │
                    └─► Phase 9 (ST Helper reminder tags) ◄── Phase 1
```

**Phases 3 and 4** can overlap — folder type additions (Phase 3) are a subset of Phase 4.  
**Phase 9** can be worked any time after Phase 4 lands, independent of Phases 5–8.

---

### Complexity & Effort

| Phase | What ships | Effort | Risk |
|-------|-----------|--------|------|
| 1 — Char editor reminders | `ReminderTokenEditor` + `CustomCharDialog` UI | Small | Low |
| 2 — Scripts tab shell | New tab layout, cards, detail view | Large | Medium — replaces existing tab |
| 3 — Script folders | Folder CRUD + left panel sections | Medium | Low |
| 4 — Core type extensions | `types.ts` + `catalog.ts` functions | Small | Low — all optional fields |
| 5 — Script parser | `parseBloodstar.ts` + tests | Medium | Low — pure TS |
| 6 — Night order upgrade | Switch to `buildNightOrderForScript` | Small | Low |
| 7 — Import dialog | 3-step import flow | Large | Medium — network + conflict UI |
| 8 — Version display | Read-only chip + history in char dialog | Small | Low |
| 9 — ST Helper reminders | Suggestion chips in night phase | Medium | Medium — game state |

---

*End of design document.*
