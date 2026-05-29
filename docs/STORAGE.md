# Storage Contract

This document is the source of truth for persisted browser/native keys. Update it whenever a feature adds, renames, migrates, exports, or cloud-syncs stored data.

## Rules

- Define new keys as exported constants near the owning feature, not as repeated string literals.
- Prefer `storageSync` for data that must work on native platforms; `nativeInit.ts` must preload every key that React reads synchronously on native.
- Treat browser storage and Capacitor Preferences as user-visible, local persistence, not as secure secret storage.
- Do not include provider API keys, OAuth tokens, PKCE verifier/state, Google user profile data, card-deal host tokens, or guest tokens in backup exports.
- Validate JSON before applying imported or cloud-synced data. Keep unknown future fields when merging existing records.
- Add a migration note here before removing a legacy key.

## Core Data

| Key | Owner | Shape | Platform | Export | Cloud Sync | Migration |
| --- | --- | --- | --- | --- | --- | --- |
| `botc-storyteller-companion-v5` | `StorytellerSub` | persisted storyteller state, including active game and `gameRecords` | `storageSync` | records can be exported separately; active game is not in bundle export | `gameRecords` only | current key |
| `botc-storyteller-companion-v4` | `StorytellerSub` | legacy storyteller state | read fallback only | no | no | remove after a verified migration helper replaces fallback reads |
| `botc-storyteller-companion-v3` | `StorytellerSub` | legacy storyteller state | read fallback only | no | no | remove after a verified migration helper replaces fallback reads |
| `BOTC_USER_SCRIPTS` | Scripts | editable user scripts | `storageSync` | yes | yes, as `botc-scripts.json` | preserve unknown script fields |
| `BOTC_SCRIPT_META` | Scripts | script metadata, folders, and per-script UI metadata | `storageSync` | yes | yes, as `botc-script-meta.json` | preserve unknown metadata fields |
| `BOTC_SCRIPT_FOLDERS` | Scripts | script folder list | `localStorage` | no | no | migrate to `storageSync` before native dependence |

## Catalog Overrides

| Key | Owner | Shape | Export | Cloud Sync | Notes |
| --- | --- | --- | --- | --- | --- |
| `BOTC_CUSTOM_CHARACTERS` | Characters | `CustomCharacter[]` | yes | yes, as `botc-custom-characters.json` | merge by `id` for imports |
| `BOTC_REVISION_OVERRIDES` | Characters | revision override map | yes | yes, as `botc-revision-overrides.json` | merge object fields |
| `BOTC_JINX_OVERRIDES` | Jinx manager | jinx pair override map | no | no | local-only UI edits |
| `BOTC_CHAR_PACK_OVERRIDES` | Character packs | uploaded pack override map | no | no | can be regenerated from pack import |
| `BOTC_CHAR_REMINDERS` | Characters | reminder token override map | no | no | user-edited reminder labels |
| `BOTC_CHAR_NIGHT_OVERRIDES` | Characters | night reminder/setup override map | no | no | user-edited night text |

## Cloud Sync And OAuth

| Key | Owner | Shape | Export | Security Policy |
| --- | --- | --- | --- | --- |
| `BOTC_LAST_SYNC` | Cloud sync | epoch milliseconds | no | local sync metadata only |
| `BOTC_GOOGLE_USER_INFO` | Cloud sync | Google profile summary | no | clear on disconnect when possible |
| `BOTC_GOOGLE_CLIENT_ID` | OAuth settings | Google OAuth client id | no | public identifier |
| `BOTC_GOOGLE_CLIENT_SECRET` | OAuth settings | Google OAuth web client secret | no | client-side secret is public in practice; public deployments should use a server-side OAuth proxy |
| `BOTC_GOOGLE_TOKENS` | OAuth runtime | access token, refresh token, expiry | no | never log or export |
| `BOTC_PKCE_VERIFIER` | OAuth runtime | PKCE verifier | no | short-lived flow state; clear with tokens |
| `BOTC_OAUTH_STATE` | OAuth runtime | CSRF state | no | short-lived flow state; clear with tokens |

Cloud Drive stores only user data files in the app data folder: `botc-scripts.json`, `botc-custom-characters.json`, `botc-revision-overrides.json`, `botc-game-records.json`, and `botc-script-meta.json`.

## Card Dealing

| Key | Owner | Shape | Lifetime | Export |
| --- | --- | --- | --- | --- |
| `botc-deal-host-${sessionId}` | Deal host | host token for one deal session | local until manually cleared or overwritten | no |
| `botc-deal-active-host` | Deal host | latest `{ sessionId, hostToken }` | local until replaced | no |
| `botc-deal-game-${gameId}` | Deal host | game-linked `{ sessionId, hostToken }` | local with the game | no |
| `botc-deal-guest-token` | Deal guest | guest browser token | `sessionStorage` tab/session lifetime | no |

Firestore deal sessions expire after 24 hours by app-layer lazy cleanup. Host token checks are currently app-layer; tighten with server-side rules or Cloud Functions before treating deal sessions as private.

## AI And Translation

| Key | Owner | Shape | Export | Notes |
| --- | --- | --- | --- | --- |
| `BOTC_AI_SETTINGS` | AI panel | provider, model, provider API keys | no | API keys must never be exported |
| `BOTC_AI_FILL_LOG` | AI fill log | capped fill history | no | capped at 500 entries |
| `BOTC_TRANSLATION_MEMORY` | translation memory | confirmed EN/ZH pairs | no | capped at 200 entries |

## UI Preferences

| Key | Owner | Shape | Native Preload | Export |
| --- | --- | --- | --- | --- |
| `botc-active-tab` | navigation | tab id | yes | no |
| `botc-ui-language` | app shell | `en` or `zh` | yes | no |
| `botc-theme-mode` | theme | theme mode | yes | no |
| `botc-font-settings-v2` | typography | font settings object | yes | no |
| `botc-bgm-custom-tracks` | audio | custom BGM track list | yes | no |
| `botc-default-st-name` | game setup | default Storyteller name | no | no |
| `botc-tutorial-done` | tutorial | completion flag | no | no |

## Share Flow Temporaries

| Key | Owner | Shape | Lifetime |
| --- | --- | --- | --- |
| `BOTC_PENDING_AR` | share/import router | pending analytics record payload | `sessionStorage`, cleared after consume |
| `BOTC_PENDING_SL` | share/import router | pending shared link payload | `sessionStorage`, cleared after consume |
| `BOTC_PENDING_SS` | share/import router | pending shared script payload | `sessionStorage`, cleared after consume |

## Adding Or Migrating Keys

1. Add an exported key constant in the owning module.
2. Add the key to this document with owner, shape, export behavior, cloud-sync behavior, and migration policy.
3. If native needs synchronous reads, add the key to `ALL_STORAGE_KEYS` in `src/lib/nativeInit.ts`.
4. If the value can be exported or cloud-synced, add shape validation and an import/merge policy before writing it.
5. For renames, write a versioned migration helper, keep the old key as a read fallback for one release window, then remove it after tests and `rg` confirm no active writers remain.
