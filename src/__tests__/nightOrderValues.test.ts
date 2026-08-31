/**
 * Night-order position values.
 *
 * The arrays in night-order.json stay the readable order; `order` gives each
 * entry a number spaced by 10 so a character can be slotted between two
 * existing ones, and `source_order` records the value a pack publishes for its
 * own characters (Odyssey's 夜序数值) so a re-sync can place a new character by
 * comparison rather than by a "preceding character" anchor.
 *
 * Two derived sources of truth can drift, so these tests keep them in step.
 */

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { NightOrderData } from '../types'

const nightOrder = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'assets', 'characters', 'night-order.json'), 'utf8'),
) as Required<NightOrderData>

const NIGHTS = [
  ['first_night', nightOrder.first_night] as const,
  ['other_nights', nightOrder.other_nights] as const,
]

describe('night order values', () => {
  for (const [key, list] of NIGHTS) {
    const values = nightOrder.order[key] ?? {}

    it(`${key}: every entry has a value and no value is orphaned`, () => {
      expect(list.filter((id) => values[id] === undefined)).toEqual([])
      expect(Object.keys(values).filter((id) => !list.includes(id))).toEqual([])
    })

    it(`${key}: sorting by value reproduces the array exactly`, () => {
      const sorted = Object.keys(values).sort((a, b) => values[a] - values[b])
      expect(sorted).toEqual(list)
    })

    it(`${key}: values are unique and leave gaps for insertion`, () => {
      const sorted = [...Object.values(values)].sort((a, b) => a - b)
      expect(new Set(sorted).size).toBe(sorted.length)
      const gaps = sorted.slice(1).map((value, i) => value - sorted[i])
      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(2)
    })
  }
})

describe('pack-published night values', () => {
  // ojo and lord_of_typhon sit in the opposite relative order here to the one
  // Odyssey assumed when numbering its demons, so corruptus (anchored to ojo)
  // lands before skeleton_king (anchored to lord_of_typhon) despite a higher
  // published value. Only one Demon is ever in play, so the relative order of
  // two Demons has no effect on a game — left as-is rather than overriding the
  // anchors the pack published. Tracked in docs/ODYSSEY-TODO.md.
  const KNOWN_INVERSIONS: Record<string, Array<[string, string]>> = {
    first_night: [],
    other_nights: [['corruptus', 'skeleton_king']],
  }

  for (const [key, list] of NIGHTS) {
    const source = nightOrder.source_order[key] ?? {}

    it(`${key}: published values only reference entries in the array`, () => {
      expect(Object.keys(source).filter((id) => !list.includes(id))).toEqual([])
    })

    it(`${key}: array order agrees with the published values`, () => {
      const seq = list.filter((id) => source[id] !== undefined)
      const allowed = new Set(KNOWN_INVERSIONS[key].map(([a, b]) => `${a}>${b}`))
      const inversions = seq
        .slice(1)
        .map((id, i) => [seq[i], id] as const)
        .filter(([before, after]) => source[before] > source[after])
        .filter(([before, after]) => !allowed.has(`${before}>${after}`))
        .map(([before, after]) => `${before}(${source[before]}) before ${after}(${source[after]})`)
      expect(inversions).toEqual([])
    })
  }

  it('covers the Odyssey characters that wake', () => {
    // 32 of 33 first-night and 70 of 72 other-night Odyssey entries publish a
    // value; paladin and echo only give a preceding character.
    expect(Object.keys(nightOrder.source_order.first_night ?? {}).length).toBeGreaterThanOrEqual(32)
    expect(Object.keys(nightOrder.source_order.other_nights ?? {}).length).toBeGreaterThanOrEqual(70)
  })
})
