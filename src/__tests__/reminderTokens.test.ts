import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { getCharacterReminders, getCharacterRemindersGlobal } from '../catalog'
import type { CharacterFileEntry } from '../types'

/**
 * Reminder tokens in both languages (scripts/sync-reminders.mjs): English at
 * the top level, Chinese under `zh`, one entry per physical token in the same
 * order, so a Chinese game never shows English tokens and an English game
 * never shows Chinese ones when an English list exists.
 */

const dir = path.join(process.cwd(), 'assets', 'characters', 'individual')
const characters = fs.readdirSync(dir)
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')) as CharacterFileEntry)

const OFFICIAL = ['tb', 'bmr', 'snv', 'experimental', 'fabled', 'loric']
const CJK = /[㐀-鿿]/
// Tokens that read the same in both languages.
const NEUTRAL = /^[\d?？X]+$/

describe('reminder tokens', () => {
  it('keeps English tokens free of Chinese', () => {
    const chinese = characters
      .flatMap((c) => [...(c.reminders ?? []), ...(c.remindersGlobal ?? []), ...(c.en?.reminders ?? []), ...(c.en?.remindersGlobal ?? [])]
        .map((token) => ({ id: c.id, token })))
      .filter(({ token }) => CJK.test(token))
      .map(({ id, token }) => `${id}: ${token}`)
    expect(chinese).toEqual([])
  })

  it('gives every English token a Chinese one, in the same order', () => {
    const wrong = characters.flatMap((c) => (['reminders', 'remindersGlobal'] as const).flatMap((key) => {
      // Packs keep their English list in the `en` block (Odyssey), the official editions at the top level.
      const en = c[key] ?? c.en?.[key] ?? []
      const zh = c.zh?.[key] ?? []
      if (!en.length && !zh.length) return []
      if (!OFFICIAL.includes(c.edition) && !en.length) return [] // Chinese-only packs
      if (en.length !== zh.length) return [`${c.id}.${key}: ${en.length} English, ${zh.length} Chinese`]
      return zh.flatMap((token, i) => {
        const translated = CJK.test(token) || (NEUTRAL.test(token) && NEUTRAL.test(en[i]))
        const sameAsBefore = i === 0 || (en[i] === en[i - 1]) === (token === zh[i - 1])
        return translated && sameAsBefore ? [] : [`${c.id}.${key}[${i}]: ${en[i]} → ${token}`]
      })
    }))
    expect(wrong).toEqual([])
  })

  it('resolves each language to its own tokens', () => {
    expect(getCharacterReminders('fortuneteller', 'en')).toEqual(['Red Herring'])
    expect(getCharacterReminders('fortuneteller', 'zh')).toEqual(['干扰项'])
    expect(getCharacterReminders('acrobat', 'zh')).toEqual(['死亡', '被选择'])
    expect(getCharacterRemindersGlobal('drunk', 'en')).toEqual(['Is The Drunk'])
    expect(getCharacterRemindersGlobal('drunk', 'zh')).toEqual(['是酒鬼'])
    // One token per physical token: the Courtier's three drunk counters.
    expect(getCharacterReminders('courtier', 'zh')).toEqual(['醉酒3', '醉酒2', '醉酒1', '失去能力'])
  })

  it('resolves a pack\'s tokens from its language blocks (Odyssey: community English)', () => {
    expect(getCharacterReminders('aerialist', 'zh')).toEqual(['醉酒'])
    expect(getCharacterReminders('aerialist', 'en')).toEqual(['Drunk'])
    expect(getCharacterReminders('cowboy', 'en')).toEqual(['Nemesis', 'Has Nominated', 'Showdown'])
    expect(getCharacterReminders('cowboy', 'zh')).toEqual(['宿敌', '发起提名', '了断'])
  })
})
