# Storyteller Helper — UX & Terminology Improvement Plan

Based on official BotC glossary (wiki.bloodontheclocktower.com/Glossary) and Chinese
localization wiki (clocktower-wiki.gstonegames.com/术语汇总).

---

## Part 1 — Terminology Fixes (DONE in this session)

### Completed
| Key | Old ZH | New ZH | Reason |
|-----|--------|--------|--------|
| `ability_text_en/zh` | 技能文本 | 能力文本 | 技能=skill (RPG); 能力=ability (official BotC) |
| `jinx_manager` | Jinx 管理 | 相克管理 | No EN mixing in ZH strings |
| `new_jinx_pair` | 新建 Jinx 对 | 新建相克对 | Same |
| `no_custom_jinxes` | 暂无自定义 Jinx 规则 | 暂无自定义相克规则 | Same |
| `jinxes_n` | Jinx 关联（{0}） | 相克（{0}） | Same |
| `other_nights` | 非首夜 | 其他夜晚 | 非首夜 = double-negative; 其他夜晚 = natural |
| `active` / `inactive` | 活跃/非活跃 | 启用/禁用 | 活跃 describes player state; 启用/禁用 = rule toggle |
| `drag_reorder_hint` | verbose | simplified | redundant 可 |

### Added ~80 BotC game terms to locale files
All new keys available via `t()` / `tpl()` for use in storyteller components.

---

## Part 2 — Storyteller Helper: Hardcoded Strings (~140 remaining)

### Scope
These components still use inline `zh ? '...' : '...'` ternaries:

| File | Count |
|------|-------|
| ArenaSeatPlayerModal.tsx | 59 |
| RightConsoleRecords.tsx | 21 |
| ModalsNewGameCharactersTab.tsx | 20 |
| ModalsExport.tsx | 14 |
| BgmBar.tsx | 9 |
| NominationVoteList.tsx | 8 |
| ModalsDialog.tsx | 4 |
| GameActionsBar.tsx | 3 |
| RightConsoleSettings.tsx | 3 |

**Action:** Replace with `t()` / `tpl()` using the new game-term keys. All keys are now
in locale files. This is mechanical work — run a pass similar to the previous i18n refactor.

---

## Part 3 — Terminology Consistency Issues

### `不在场角色` vs `恶魔虚张`
Two different ZH strings appear in the codebase for "Demon Bluffs":
- `恶魔虚张` — CORRECT (official term, in storyteller modal)
- `不在场角色` — WRONG (literal "characters not in scene", in ScriptEditor)

**Fix:** In ScriptEditor (JinxPairRow area where demon bluffs shown), replace
`不在场角色` with `恶魔虚张`. New locale key `demon_bluffs` = 'Demon Bluffs' / '恶魔虚张'.

### `技` abbreviation for "skill" in table headers
Currently `技能记录` shortens to `技` (1 char) in compact views. After renaming to
`能力记录`, abbreviation should be `能` or just use `技能` column header as-is since
it's a table abbreviation context. Needs review in `ArenaSeatPlayerModal.tsx`.

### `感知角色` vs `玩家以为`
Both used for "Perceived Character" (what the player believes their role to be).
- Standardize to `感知身份` (locale key: `perceived_character`)
- `实际身份` for Actual Character (was `实际角色`)

### `放逐` (Exile) — already correct per wiki.

### `处决` (Execution) — already correct per wiki.

### `提名` (Nomination) — already correct per wiki.

---

## Part 4 — Storyteller Helper: Game UX Improvements

### 4.1 Night Phase View

**Current:** Night order shows characters in list. No clear indication of which phase
action belongs to (first night vs other nights).

**Proposed:**
- Show "First Night" / "Other Nights" header badge on wake-up panel
- Characters that only wake on first night: dim on non-first nights
- Characters that never wake (◯ on night sheet): visually muted

### 4.2 Demon Bluffs Panel

**Current:** Shows 3 characters as "Demon Bluffs" (恶魔虚张). Not linked to character
abilities.

**Proposed:**
- Show bluff character ability text inline (tooltip or expandable)
- Warn if bluff character is in play (would invalidate the bluff)
- Allow ST to assign a "shown to demon" flag per bluff

### 4.3 Player State Badges

**Current:** Dead/alive shown, but no visual for drunk/poisoned.

**Proposed:** Add compact status badges on each seat token:
- 💀 Dead (†)
- 🍺 Drunk (醉酒) — shown only in Grimoire view
- ☠ Poisoned (中毒) — shown only in Grimoire view
- ⊘ No-vote (无票权)

These are ST-only states — should be hidden on public view.

### 4.4 Nomination & Execution Flow

**Current:** Nomination/vote is tracked but the "about to die" rule (needs > half living
non-travelers + more than current leader) is not prominently displayed.

**Proposed:**
- Show required vote count dynamically: `需要 X 票` where X = ⌈living/2⌉
- Highlight current leading nominee
- "About to die" chip on nominee who currently meets threshold
- Lock nominations after max of (players - 1) nominations per day rule

### 4.5 Grimoire Annotations

**Current:** ST can add tags and notes to seats.

**Proposed additions:**
- "Reminder tokens" concept: attach small reminder notes to a player's seat from a
  predefined list relevant to their character (e.g. "poisoned tonight", "protected")
- Quick toggle: Sober/Drunk/Poisoned per seat (affects ability display)
- "In play" / "Not in play" tracker for Fabled and characters ST added

### 4.6 Character Ability Quick-Reference in Grimoire

**Current:** Must switch to Characters tab to see ability text.

**Proposed:** On each seat in Grimoire, long-press or hover shows:
- Character icon + name + ability text
- Current revision if non-default
- Jinx warnings with other in-play characters

### 4.7 Night Phase Whisper Tracking (for certain characters)

Some characters (Gossip, Juggler, etc.) depend on whisper counts or public claims.
ST currently tracks this manually.

**Proposed:** Add a "whisper count" or "public claim" field to the event log that the
ST can increment.

### 4.8 Phase Summary / Day Log

**Current:** Event log shows raw events.

**Proposed:** At top of each day, show summary card:
- Who died overnight (and cause if known to ST)
- Who was executed yesterday
- Current living/dead count
- Nominations remaining today (BotC rule: ≤ player count nominations per day)

---

## Part 5 — Script Editor / Characters Tab UX

### 5.1 Jinx Display in Script View (read-only)
When viewing a script (not editing), jinxes between in-script characters should be
visually highlighted on the script sheet — currently only shown in edit mode.

### 5.2 Character Ability Version Badge
When a character has a non-current revision pinned to a script, show a version badge
on the character card in the script viewer (e.g. `v2` chip).

### 5.3 Bootlegger Rules Formatting
Long bootlegger rules can be hard to scan. Add numbered list display.

---

## Priority Order

1. **P0 (now):** Storyteller i18n — replace ~140 hardcoded zh? in storyteller files
2. **P1:** Fix `不在场角色` → `恶魔虚张` in ScriptEditor
3. **P1:** Player state badges (drunk/poisoned) in Grimoire
4. **P2:** Nomination vote count display (`需要 X 票`)
5. **P2:** Character ability tooltip in Grimoire seat
6. **P3:** Night phase first/other visual distinction
7. **P3:** Day summary card
8. **P3:** Demon Bluffs ability preview
