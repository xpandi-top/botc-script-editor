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
 *   7. Deprecated terminology — flag project-specific terms with preferred replacements
 *   8. Legacy suffix keys — flag new _2-style migration keys unless explicitly allowed
 *   9. Reusable duplicate values — flag configured duplicate UI labels that should share keys
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
const TERMINOLOGY_PATH = resolve(ROOT, 'assets/locales/terminology.json')
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
 * Keys known to be intentionally long (no truncation, no semantic alias needed).
 * These are long but self-explanatory enough that renaming isn't worthwhile.
 */
const ACCEPTABLE_LONG_KEYS = new Set([
  'tokens_available_on_all_seats',  // short enough, kept
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

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    console.error(`✗ Failed to load ${path}: ${e.message}`)
    process.exit(1)
  }
}

const en = loadUi(EN_PATH)
const zh = loadUi(ZH_PATH)
const terminology = loadJson(TERMINOLOGY_PATH)

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
    if (ACCEPTABLE_LONG_KEYS.has(k)) continue
    // Check if it ends mid-word (likely auto-truncated)
    const lastWord = k.split('_').pop() ?? ''
    if (lastWord.length < 3 || (lastWord.endsWith('c') && k.endsWith('_c'))) {
      warn(`Key "${k}" looks auto-truncated (${k.length} chars) — add a shorter semantic alias`)
    } else {
      warn(`Key "${k}" is very long (${k.length} chars) — consider a shorter semantic key`)
    }
    truncatedCount++
  }
}
if (truncatedCount === 0) console.log('  ✓ No overly long or truncated keys')

// ── Check 6: Skill/RPG wording in EN values ───────────────────────────────────

console.log('\n── Check 6: Skill/RPG wording (BOTC uses "ability") ─────')

// Keys intentionally using "skill" as a non-BOTC concept (AI panel skill cards).
const SKILL_WORDING_OK = new Set(terminology.allowedSkillKeys ?? [])

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

// ── Check 7: Deprecated project terminology ──────────────────────────────────

console.log('\n── Check 7: Deprecated BOTC terminology ─────────────────')

let deprecatedTermCount = 0
const localeByLanguage = { en, zh }
for (const rule of terminology.deprecatedTerms ?? []) {
  const ui = localeByLanguage[rule.language]
  if (!ui || !rule.term) continue
  const allowedKeys = new Set(rule.allowedKeys ?? [])
  for (const [k, v] of Object.entries(ui)) {
    if (allowedKeys.has(k)) continue
    const str = String(v)
    if (str.includes(rule.term)) {
      warn(
        `${rule.language.toUpperCase()}["${k}"] uses deprecated term "${rule.term}"` +
        ` — prefer "${rule.preferred}"${rule.reason ? ` (${rule.reason})` : ''}`,
      )
      deprecatedTermCount++
    }
  }
}
if (deprecatedTermCount === 0) console.log('  ✓ No deprecated BOTC terms found')

// ── Check 8: Legacy _2 suffix keys ───────────────────────────────────────────

console.log('\n── Check 8: Legacy suffix keys ──────────────────────────')

const ALLOWED_LEGACY_SUFFIX_KEYS = new Set(terminology.allowedLegacySuffixKeys ?? [])
let legacySuffixCount = 0
for (const k of enKeys) {
  if (!/_\d+$/.test(k)) continue
  if (ALLOWED_LEGACY_SUFFIX_KEYS.has(k)) continue
  warn(`Key "${k}" uses a migration-style numeric suffix — define a semantic key or add a documented exception`)
  legacySuffixCount++
}
if (legacySuffixCount === 0) console.log('  ✓ No new legacy suffix keys found')

// ── Check 9: Reusable duplicate UI values ────────────────────────────────────

console.log('\n── Check 9: Reusable duplicate UI values ────────────────')

let duplicateRuleCount = 0
for (const rule of terminology.duplicateValueRules ?? []) {
  const ui = localeByLanguage[rule.language]
  if (!ui || !rule.value || !rule.canonicalKey) continue
  const allowedKeys = new Set([rule.canonicalKey, ...(rule.allowedKeys ?? [])])
  const matchingKeys = Object.entries(ui)
    .filter(([, v]) => String(v) === rule.value)
    .map(([k]) => k)
  for (const k of matchingKeys) {
    if (allowedKeys.has(k)) continue
    warn(
      `${rule.language.toUpperCase()}["${k}"] duplicates "${rule.value}"` +
      ` — reuse canonical key "${rule.canonicalKey}" or document an exception`,
    )
    duplicateRuleCount++
  }
}
if (duplicateRuleCount === 0) console.log('  ✓ No unmanaged reusable duplicate values found')

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
