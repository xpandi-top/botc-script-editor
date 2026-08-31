/**
 * Display-name collisions between independently authored packs.
 *
 * Two pairs collide in the shipped data, one per language:
 *   zh — Odyssey 阴阳师 (onmyoji) vs Hua Deng Chu Shang 阴阳师 (yinyangshi)
 *   en — Odyssey Rascal (rascal) vs Hua Deng Chu Shang Rascal (xionghaizi)
 *
 * Neither can be renamed without editing someone else's pack, so the fix is at
 * display time and must stay scoped to the names that actually collide.
 */

import { describe, expect, it } from 'vitest'
import { getDisambiguatedName, getDisplayName, hasAmbiguousName } from '../catalog'

describe('hasAmbiguousName', () => {
  it('flags both sides of the Chinese collision', () => {
    expect(hasAmbiguousName('onmyoji', 'zh')).toBe(true)
    expect(hasAmbiguousName('yinyangshi', 'zh')).toBe(true)
  })

  it('flags both sides of the English collision', () => {
    expect(hasAmbiguousName('rascal', 'en')).toBe(true)
    expect(hasAmbiguousName('xionghaizi', 'en')).toBe(true)
  })

  it('is language-specific — a pair that collides in one language may not in the other', () => {
    expect(hasAmbiguousName('onmyoji', 'en')).toBe(false)
    expect(hasAmbiguousName('rascal', 'zh')).toBe(false)
  })

  it('leaves unique names alone', () => {
    expect(hasAmbiguousName('painter', 'zh')).toBe(false)
    expect(hasAmbiguousName('washerwoman', 'en')).toBe(false)
  })
})

describe('getDisambiguatedName', () => {
  it('qualifies a colliding Chinese name with its pack', () => {
    expect(getDisambiguatedName('onmyoji', 'zh')).toBe('阴阳师（奥德赛）')
    expect(getDisambiguatedName('yinyangshi', 'zh')).toBe('阴阳师（华灯初上）')
  })

  it('qualifies a colliding English name with its pack', () => {
    expect(getDisambiguatedName('rascal', 'en')).toBe('Rascal (Odyssey)')
    expect(getDisambiguatedName('xionghaizi', 'en')).toBe('Rascal (Hua Deng Chu Shang)')
  })

  it('matches getDisplayName when there is no collision', () => {
    for (const id of ['painter', 'washerwoman', 'imp', 'onmyoji']) {
      for (const language of ['en', 'zh'] as const) {
        if (hasAmbiguousName(id, language)) continue
        expect(getDisambiguatedName(id, language)).toBe(getDisplayName(id, language))
      }
    }
  })

  it('does not throw on an unknown id', () => {
    expect(getDisambiguatedName('not-a-character', 'en')).toBe(getDisplayName('not-a-character', 'en'))
  })
})
