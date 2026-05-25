#!/usr/bin/env node
/**
 * i18n-check.mjs — BOTC Companion locale validator
 *
 * Checks:
 *   1. Key parity  — every EN key must exist in ZH and vice-versa
 *   2. Empty values — no key may have an empty string
 *   3. Placeholder parity — {0}, {1}, etc. must match between EN and ZH
 *   4. Raw English in ZH — flag unexpected English text (except allowed terms)
 *   5. Truncated keys — warn about keys > 50 characters (auto-generated remnants)
 *   6. Skill/RPG wording — flag "Skill" where BOTC "Ability" is appropriate
 *
 * Usage:
 *   node scripts/i18n-check.mjs
 *   node scripts/i18n-check.mjs --strict  (exit 1 on any warning)
 *
 * Returns exit code 1 if any ERROR is found (or in --strict mode, any warning).
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT  = resolve(__dir, '..')

// ── Config ────────────────────────────────────────────────────────────────────

const EN_PATH = resolve(ROOT, 'assets/locales/en.json')
const ZH_PATH = resolve(ROOT, 'assets/locales/zh.json')
const STRICT  = process.argv.includes('--strict')

/**
 * Chinese values are allowed to contain these English terms verbatim.
 * Case-insensitive matching.
 */
const ALLOWED_EN_IN_ZH = [
  'AI', 'JSON', 'PDF', 'ID', 'URL', 'API',
  'Google Drive', 'OAuth', 'OAuth2',
  'BOTC', 'Blood on the Clocktower',
  'Storyteller Companion',           // product name
  'Override',                        // preserved from legacy system
  'DIY',                             // tab label
  'BGM',                             // music term
  'MVP',                             // stat term
]

/**
 * Keys known to be intentionally English-valued in zh.json (legacy or design choice).
 * Add to this list when a key is legitimately kept in English.
 */
const ZH_ENGLISH_EXCEPTIONS = new Set([
  'app_title',             // product name stays EN
  'str_en',                // language toggle label — UI switch
  'lang_switch',           // semantic alias for str_en
  'en',                    // internal lang code
  'zh',                    // internal lang code
  'english',               // label for "English" option in language selector
  'slug',                  // technical term (URL slug) — no standard ZH
  'jinx_pair_placeholder', // example value contains EN character ID
])

/**
 * Deprecated long/truncated keys that now have semantic aliases.
 * Suppress the truncated-key warning — migration path exists.
 * Remove from this set once the component is updated to use the semantic key.
 */
const DEPRECATED_LONG_KEYS = new Set([
  'switch_between_the_warm_parchment_light_theme_and_the_dark_c', // → settings_theme_desc
  'font_settings_are_saved_locally_and_persist_across_reloads_g', // → settings_font_persist_note
  'export_a_full_backup_containing_scripts_custom_characters_re',  // → backup_export_desc
  'this_link_opens_this_script_directly_link_never_expires',       // → share_link_permanent_note
  'this_link_contains_a_full_copy_of_the_script_valid_for_24_ho', // → share_link_24h_note
  'ensure_this_exact_redirect_uri_is_registered_in_cloud_consol', // → gdrive_redirect_note
  'add_this_uri_to_google_cloud_console_authorized_redirect_uri', // → gdrive_add_uri_note
  'oauth_credentials_are_preconfigured_just_click_connect_googl', // → gdrive_preconfigured_note
  'data_stored_in_your_private_google_drive_appdatafolder_only_', // → gdrive_appdatafolder_note
  'connect_google_drive_to_automatically_sync_scripts_custom_ch', // → gdrive_connect_desc
  'character_team_used_in_analytics_blank_names_autouse_seat_nu', // → analytics_char_team_hint
  'no_custom_scripts_yet_use_the_buttons_above_to_get_started',   // → scripts_empty_hint
  'all_data_for_this_day_events_votes_skill_log_will_be_permane', // → delete_day_confirm
  'no_character_data_add_character_assignments_to_records',       // → analytics_no_char_data
  'no_records_yet_complete_a_game_or_add_records_manually_to_se', // → analytics_no_records_hint
  'note_this_is_a_new_character_not_yet_saved_to_the_database',   // → char_unsaved_note
  'tokens_available_on_every_seat_regardless_of_assignment',      // → tokens_all_seats_note
])

// ── Load ──────────────────────────────────────────────────────────────────────

function loadUi(path) {
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    return raw.ui ?? {}
  } catch (e) {
    console.error(`✗ Failed to load ${path}: ${e.message}`)
    process.exit(1)
  }
}

const en = loadUi(EN_PATH)
const zh = loadUi(ZH_PATH)

// ── Helpers ───────────────────────────────────────────────────────────────────

let errors = 0
let warnings = 0

function error(msg) {
  console.error(`  ✗ ERROR   ${msg}`)
  errors++
}

function warn(msg) {
  console.warn(`  ⚠ WARNING ${msg}`)
  warnings++
}

function extractPlaceholders(str) {
  return (str.match(/\{(\d+)\}/g) ?? []).sort()
}

function looksEnglish(str) {
  // Heuristic: >40% ASCII letters and no Chinese/Japanese characters
  if (!str || str.length < 4) return false
  const ascii = str.match(/[a-zA-Z]/g)?.length ?? 0
  const cjk   = str.match(/[一-鿿぀-ヿ]/g)?.length ?? 0
  return cjk === 0 && ascii / str.length > 0.4
}

function containsAllowedTerm(str) {
  const lower = str.toLowerCase()
  return ALLOWED_EN_IN_ZH.some((term) => lower.includes(term.toLowerCase()))
}

// ── Check 1: Key parity ───────────────────────────────────────────────────────

console.log('\n── Check 1: Key parity ──────────────────────────────────')

const enKeys = new Set(Object.keys(en))
const zhKeys = new Set(Object.keys(zh))

const enOnly = [...enKeys].filter((k) => !zhKeys.has(k))
const zhOnly = [...zhKeys].filter((k) => !enKeys.has(k))

if (enOnly.length === 0 && zhOnly.length === 0) {
  console.log('  ✓ All keys match between EN and ZH')
} else {
  for (const k of enOnly) error(`Key "${k}" exists in EN but not ZH`)
  for (const k of zhOnly) error(`Key "${k}" exists in ZH but not EN`)
}

// ── Check 2: Empty values ─────────────────────────────────────────────────────

console.log('\n── Check 2: Empty values ────────────────────────────────')

let emptyCount = 0
for (const [k, v] of Object.entries(en)) {
  if (v === '' || v == null) { error(`EN["${k}"] is empty`); emptyCount++ }
}
for (const [k, v] of Object.entries(zh)) {
  if (v === '' || v == null) { error(`ZH["${k}"] is empty`); emptyCount++ }
}
if (emptyCount === 0) console.log('  ✓ No empty values found')

// ── Check 3: Placeholder parity ───────────────────────────────────────────────

console.log('\n── Check 3: Placeholder parity ──────────────────────────')

let placeholderMismatches = 0
for (const k of enKeys) {
  if (!zhKeys.has(k)) continue
  const enPh = extractPlaceholders(String(en[k]))
  const zhPh = extractPlaceholders(String(zh[k]))
  if (JSON.stringify(enPh) !== JSON.stringify(zhPh)) {
    error(`Placeholder mismatch for "${k}": EN=${JSON.stringify(enPh)} ZH=${JSON.stringify(zhPh)}`)
    placeholderMismatches++
  }
}
if (placeholderMismatches === 0) console.log('  ✓ All placeholders match')

// ── Check 4: Raw English in ZH ────────────────────────────────────────────────

console.log('\n── Check 4: Raw English in ZH ───────────────────────────')

let rawEnCount = 0
for (const [k, v] of Object.entries(zh)) {
  if (ZH_ENGLISH_EXCEPTIONS.has(k)) continue
  const str = String(v)
  if (looksEnglish(str) && !containsAllowedTerm(str)) {
    warn(`ZH["${k}"] looks like raw English: "${str.slice(0, 60)}"`)
    rawEnCount++
  }
}
if (rawEnCount === 0) console.log('  ✓ No unexpected raw English in ZH values')

// ── Check 5: Truncated keys ───────────────────────────────────────────────────

console.log('\n── Check 5: Truncated / machine-generated keys ──────────')

const TRUNCATED_PATTERN = /[a-z]$/ // ends with lowercase (not a natural word boundary)
let truncatedCount = 0
for (const k of enKeys) {
  if (k.length > 50) {
    if (DEPRECATED_LONG_KEYS.has(k)) {
      // Known deprecated key with semantic alias — skip
      continue
    }
    // Check if it ends mid-word (likely auto-truncated)
    const lastWord = k.split('_').pop() ?? ''
    if (lastWord.length < 3 || (lastWord.endsWith('c') && k.endsWith('_c'))) {
      warn(`Key "${k}" looks auto-truncated (${k.length} chars)`)
    } else {
      warn(`Key "${k}" is very long (${k.length} chars) — consider a shorter semantic key`)
    }
    truncatedCount++
  }
}
if (truncatedCount === 0) console.log(`  ✓ No new long keys (${DEPRECATED_LONG_KEYS.size} deprecated keys have semantic aliases — migrate when ready)`)

// ── Check 6: Skill/RPG wording in EN values ───────────────────────────────────

console.log('\n── Check 6: Skill/RPG wording (BOTC uses "ability") ─────')

// Keys intentionally using "skill" as a BOTC-adjacent concept (AI panel skill cards)
const SKILL_WORDING_OK = new Set([
  'skills',                             // AI panel tab (intentional UI concept)
  'skills_for_other_contexts',          // AI panel label
  'click_a_skill_card_to_run_it',       // AI panel tooltip
  'use_skill_chips_above_or_type_a_message', // AI panel hint
])

let skillRPGCount = 0
for (const [k, v] of Object.entries(en)) {
  if (SKILL_WORDING_OK.has(k)) continue
  const str = String(v)
  if (/\bSkill\b/.test(str) && !/\bAbility\b/i.test(str)) {
    warn(`EN["${k}"] uses "Skill" — consider "Ability": "${str}"`)
    skillRPGCount++
  }
}
if (skillRPGCount === 0) console.log('  ✓ No non-BOTC skill/RPG wording found')

// ── Summary ───────────────────────────────────────────────────────────────────

const allKeys = enKeys.size
console.log(`\n── Summary ───────────────────────────────────────────────`)
console.log(`  Total EN keys: ${allKeys}`)
console.log(`  Errors:   ${errors}`)
console.log(`  Warnings: ${warnings}`)

if (errors > 0) {
  console.error(`\n✗ ${errors} error(s) found. Fix before committing.`)
  process.exit(1)
}

if (STRICT && warnings > 0) {
  console.error(`\n✗ ${warnings} warning(s) found in strict mode.`)
  process.exit(1)
}

if (errors === 0 && warnings === 0) {
  console.log('\n✓ All checks passed.')
}
