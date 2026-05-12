# Versioning, Custom Characters & Cloud Sync — Design Plan

## Scope

| Feature | Complexity | Phase |
|---|---|---|
| Script notes field | XS | 1 |
| Script search + filter | S | 1 |
| Per-script character version pinning | M | 1 |
| UI to add character revisions | M | 1 |
| Custom characters (local) | L | 2 |
| Storyteller uses pinned version | M | 2 |
| Cloud sync via Google Drive | L | 3 |
| Secure sharing with friends | M | 3 |

---

## Data Model Changes

### `EditableScript` — notes + pinned revisions

```ts
export type EditableScript = {
  // ...existing fields...
  notes?: string                           // free-text ST notes for this script
  pinnedRevisions?: Record<string, string> // charId → revisionId override
}
```

`pinnedRevisions` example: `{ "imp": "v2", "poisoner": "v1-errata" }`.  
Absent = use `current_revision` from catalog (existing behaviour).

### `CustomCharacter` — new type, stored in localStorage

```ts
export type CustomCharacter = {
  id: string                     // must start with "custom_" to avoid catalog conflicts
  author: string                 // required — who created this character
  team: Team
  nameEn: string
  nameZh?: string
  abilityEn: string
  abilityZh?: string
  icon?: string                  // data URL (uploaded + resized to 128 px) or https:// URL
  edition: string                // user-defined label, default "Custom"
  firstNight?: number            // 1-based insert position into night-order first_night array
  otherNight?: number            // 1-based insert position into night-order other_nights array
  firstNightReminder?: string
  otherNightReminder?: string
  reminders?: string[]
  jinxes?: Array<{ id: string; reason: string }>
  createdAt: number
  updatedAt: number
}
```

Storage key: `BOTC_CUSTOM_CHARACTERS`

### `RevisionOverrides` — user-added revisions without touching shipped JSON

```ts
// localStorage: BOTC_REVISION_OVERRIDES
type RevisionOverrides = Record<string, {     // keyed by charId
  current_revision: string
  revisions: CharacterRevisionEntry[]         // user-added revisions appended
  locale_en: Record<string, string>           // revisionId → ability text (en)
  locale_zh?: Record<string, string>
}>
```

At runtime `catalog.ts` merges overrides on top of shipped revisions.

---

## Phase 1 — Local features (no new infra)

### 1. Script Notes

- Add `notes?: string` to `EditableScript` in `src/types.ts`
- `ScriptEditor.tsx`: collapsible "Notes" `TextField` (multiline) below meta fields
- Persists to `USER_SCRIPTS_KEY` (existing localStorage key)
- No impact on built-in (read-only) scripts

### 2. Script Search + Filter

Current `ScriptList` renders all scripts as a sidebar — fine for ~20, bad for 100+.

Changes to `ScriptsTab`:
- `TextField` search bar above the list (filter by title / author / edition)
- Filter chips: **Edition** (TB / BMR / S&V / Custom / All), team balance
- Built-in scripts collapsed under expandable group; user scripts always visible
- `useMemo` filter — no virtualisation needed until > 200 scripts

### 3. Per-Script Character Version Pinning

In `ScriptEditor`, each character in the script shows a version badge.  
Clicking opens a `Select` of available revisions → stored in `editableScript.pinnedRevisions[charId]`.

New catalog helper:

```ts
export function getRevisionForScript(
  charId: string,
  pinnedRevisions?: Record<string, string>,
): string | undefined {
  return pinnedRevisions?.[charId] ?? characterById[charId]?.current_revision
}
```

Storyteller ability text calls already accept a `revision` param — pass the script's pinned revision when rendering.

### 4. UI for Adding Character Revisions

In `CharactersTab`, "Add Revision" button on each character card opens a `Dialog`:
- Revision ID field (e.g. `v2`, `errata-2025`)
- Ability text EN + ZH textareas
- Note field (rule change summary)
- Save → writes to `BOTC_REVISION_OVERRIDES` in localStorage

`getCurrentRevision()` and `getAbilityText()` in catalog check overrides first.

---

## Phase 2 — Custom Characters

### Custom Character CRUD

New "Custom Characters" section in `CharactersTab` (or sub-tab).

"New Character" `Dialog` fields:
- Name EN / ZH
- Author (required — pre-filled from ST name setting)
- Team selector
- Ability text EN / ZH
- Icon — **two modes**:
  - Upload image file → `FileReader` → resize to 128×128 JPEG via `OffscreenCanvas` → data URL (~8–15 KB)
  - Paste `https://` URL
- Night order positions: `firstNight` number + `otherNight` number (with "between X and Y" preview)
- Night reminders (optional)
- Edition label (free text, default "Custom")

```ts
// src/lib/iconResize.ts  (NEW)
async function resizeIconToDataUrl(file: File): Promise<string> {
  const img = await createImageBitmap(file)
  const canvas = new OffscreenCanvas(128, 128)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, 128, 128)
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
  return new Promise(res => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result as string)
    reader.readAsDataURL(blob)
  })
}
```

### Catalog merge

`catalog.ts` loads `BOTC_CUSTOM_CHARACTERS` from localStorage and merges into `allCharacters` at init.  
Custom chars appear in: character picker, ScriptEditor, Storyteller assignment, night panel.

### Night Order Management

**How current system works:**

| Source | Type | Mutable? | Used by |
|---|---|---|---|
| `night-order.json` → `nightOrder` | Global static ordered ID arrays | ❌ static file | SheetArticle, Storyteller, LeftScriptPanel |
| `editableScript.meta.firstNight/otherNight` | Script-level override arrays | ✅ | SheetArticle, Storyteller |
| `ScriptCharacterItem.firstNight` (number) | Numeric wake-position hint | ✅ | Print Studio token moon indicator only |

**Runtime merge function (new in `catalog.ts`):**

```ts
export function buildEffectiveNightOrder(customChars: CustomCharacter[]): NightOrderData {
  const first = [...nightOrder.first_night]
  const other = [...nightOrder.other_nights]

  // Sort descending so splice offsets stay correct
  const firstCustom = customChars
    .filter(c => c.firstNight != null)
    .sort((a, b) => (b.firstNight ?? 0) - (a.firstNight ?? 0))
  const otherCustom = customChars
    .filter(c => c.otherNight != null)
    .sort((a, b) => (b.otherNight ?? 0) - (a.otherNight ?? 0))

  for (const c of firstCustom) {
    first.splice(Math.min(c.firstNight! - 1, first.length), 0, c.id)
  }
  for (const c of otherCustom) {
    other.splice(Math.min(c.otherNight! - 1, other.length), 0, c.id)
  }
  // No position specified → append
  for (const c of customChars) {
    if (c.firstNight == null && !first.includes(c.id)) first.push(c.id)
    if (c.otherNight == null && !other.includes(c.id)) other.push(c.id)
  }
  return { first_night: first, other_nights: other }
}
```

All `nightOrder` consumers switch to `buildEffectiveNightOrder(customChars)`.

**When custom char added to a script:**

```ts
function insertCustomCharIntoScriptOrder(
  script: EditableScript,
  char: CustomCharacter,
  allChars: CustomCharacter[],
): EditableScript {
  const effectiveOrder = buildEffectiveNightOrder(allChars)
  const firstOrder = script.meta.firstNight?.length
    ? [...script.meta.firstNight]
    : effectiveOrder.first_night.filter(id =>
        script.characters.includes(id) || id === 'MINION_INFO' || id === 'DEMON_INFO')
  const otherOrder = script.meta.otherNight?.length
    ? [...script.meta.otherNight]
    : effectiveOrder.other_nights.filter(id => script.characters.includes(id))

  if (char.firstNight != null && !firstOrder.includes(char.id))
    firstOrder.splice(Math.min(char.firstNight - 1, firstOrder.length), 0, char.id)
  if (char.otherNight != null && !otherOrder.includes(char.id))
    otherOrder.splice(Math.min(char.otherNight - 1, otherOrder.length), 0, char.id)

  return { ...script, meta: { ...script.meta, firstNight: firstOrder, otherNight: otherOrder } }
}
```

---

## Phase 3 — Cloud Sync + Sharing

### Why Google Drive

- Works from pure static site via OAuth2 PKCE (no backend, no `client_secret`)
- 15 GB free per user, user owns their data
- Drive sharing API = shareable links, controlled by user
- GitHub Pages compatible

### Auth flow (PKCE, no backend)

```
1. User clicks "Connect Google Drive"
2. App opens OAuth popup → Google consent (scopes: drive.appdata + drive.file)
3. Google redirects back with auth code (PKCE code_verifier verified client-side)
4. App exchanges code for access_token + refresh_token (stored in sessionStorage)
5. Token refresh via fetch() — no server ever involved
```

`client_id` is public, safe to embed. `client_secret` is not needed with PKCE.

### File layout in Drive `appDataFolder`

```
appDataFolder/
  botc-scripts.json
  botc-custom-characters.json
  botc-revision-overrides.json
  botc-game-records.json
  botc-settings.json
```

### Sync strategy

- On app load: if authed + Drive file newer than localStorage → pull from Drive
- On every save: write localStorage + debounced write to Drive (500 ms delay)
- Manual "Sync Now" button
- Offline: works via localStorage; queues writes; syncs on reconnect

### New files

```
src/lib/googleAuth.ts   — OAuth2 PKCE flow
src/lib/driveSync.ts    — Drive API v3 read/write wrappers
src/hooks/useCloudSync.ts — sync state + auto-sync logic
```

### Secure sharing with friends

**Tier A — Export bundle (no cloud needed)**

```json
{
  "type": "botc-share-bundle",
  "version": 1,
  "scripts": [...],
  "customCharacters": [...],
  "revisionOverrides": {...}
}
```

Friend imports via "Import Bundle" dialog. Merge with confirmation on conflicts.  
Small bundles can be base64-encoded into a URL param for direct link sharing.

**Tier B — Google Drive link (cloud users)**

- "Share via Drive" → creates a copy of selected scripts as a Drive file
- User shares the Drive link (read-only or editable)
- Friend pastes link → app fetches JSON via Drive public download endpoint
- No auth needed for public read-only links
- User controls all permissions

**Security model:**

- `appDataFolder` data: private to this app only
- Shared files: user explicitly creates and shares — they control who gets access
- Tokens stored in `sessionStorage` (cleared on tab close — reduces XSS window)
- No server ever sees user data; all flows are browser ↔ Google Drive API

---

## Files to Create / Modify

| File | Change |
|---|---|
| `src/types.ts` | Add `CustomCharacter`, `RevisionOverrides`; extend `EditableScript` |
| `src/catalog.ts` | Merge custom chars + revision overrides; add `buildEffectiveNightOrder`, `getRevisionForScript` |
| `src/lib/iconResize.ts` | **NEW** — `resizeIconToDataUrl()` |
| `src/lib/googleAuth.ts` | **NEW** — OAuth2 PKCE flow |
| `src/lib/driveSync.ts` | **NEW** — Drive API read/write |
| `src/hooks/useCloudSync.ts` | **NEW** — sync state + auto-sync |
| `src/components/tabs/ScriptsTab.tsx` | Search bar, filter chips, grouped list |
| `src/components/tabs/ScriptEditor.tsx` | Notes field, version picker per char, custom night order |
| `src/components/tabs/CharactersTab.tsx` | Add revision dialog, custom chars section |
| `src/components/tabs/SettingsTab.tsx` | Drive connect/disconnect, sync status |
| `src/App.tsx` | Load custom chars; pass to catalog; export bundle UI |
| `src/components/StorytellerSub/LeftScriptPanel.tsx` | Use `buildEffectiveNightOrder` |
| `src/components/StorytellerSub/Arena/ArenaSeat.tsx` | Use `buildEffectiveNightOrder` |
| `src/components/StorytellerSub/Arena/MobileSeatCard.tsx` | Use `buildEffectiveNightOrder` |
| `src/components/StorytellerSub/RightConsole/RightPopupScript.tsx` | Use `buildEffectiveNightOrder` |
| `src/components/SheetArticle.tsx` | Use `buildEffectiveNightOrder` |

---

## Implementation Order

### Phase 1 — ~3–4 days (local only, no new infra)
1. `EditableScript.notes` + notes textarea in ScriptEditor
2. Script search bar + edition filter chips + grouped list in ScriptsTab
3. `pinnedRevisions` on `EditableScript` + version picker badge in ScriptEditor
4. `getRevisionForScript()` in catalog; Storyteller passes pinned revision to ability text
5. Revision override UI in CharactersTab (add revision dialog → `BOTC_REVISION_OVERRIDES`)

### Phase 2 — ~3 days (custom characters)
6. `CustomCharacter` type + `BOTC_CUSTOM_CHARACTERS` localStorage
7. `catalog.ts` merge + `buildEffectiveNightOrder`
8. `src/lib/iconResize.ts`
9. Custom Character create/edit/delete UI in CharactersTab
10. Custom chars in ScriptEditor picker + night order auto-update
11. Custom chars in Storyteller assignment + night panel

### Phase 3 — ~4 days (cloud + sharing)
12. `src/lib/googleAuth.ts` — OAuth2 PKCE
13. `src/lib/driveSync.ts` — Drive API wrappers
14. `src/hooks/useCloudSync.ts` — sync state
15. Settings UI — connect/disconnect, sync status, last-synced timestamp
16. Export bundle (JSON download)
17. Import bundle UI (file upload + URL paste)
18. Drive share link generate + import

---

## Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Custom char storage | localStorage + Drive sync (Phase 3) | No backend; survives reload |
| Revision overrides | Separate localStorage key | Don't mutate shipped JSON |
| Cloud provider | Google Drive | Free, PKCE-capable, sharing built-in |
| Auth token storage | `sessionStorage` | Cleared on tab close; limits XSS window |
| Conflict resolution | Last-write-wins + Drive timestamp check | Simpler than CRDT |
| Script search | Client-side `useMemo` filter | < 500 scripts fits in memory |
| Icon storage | 128 px JPEG data URL (~10 KB) | localStorage-safe size |
| Share format | JSON bundle (file or Drive link) | No relay server needed |
