import { describe, it, expect } from 'vitest'
import { characterEmbeddingText, MISSING_ABILITY } from '../core/ai/embeddingText'
import { dequantize, normalize, quantize, VectorIndex } from '../core/ai/vectors'

describe('core/ai/embeddingText', () => {
  it('embeds both languages once each', () => {
    expect(characterEmbeddingText({ team: 'demon', name: { en: 'Imp', zh: '小恶魔' }, ability: { en: 'Each night*, choose a player: they die.', zh: '每个夜晚*，你要选择一名玩家：他死亡。' } }))
      .toBe('Imp / 小恶魔 (demon): Each night*, choose a player: they die.\n每个夜晚*，你要选择一名玩家：他死亡。')
    // Odyssey characters only have Chinese text (the catalog falls back to it for English).
    expect(characterEmbeddingText({ team: 'minion', name: { en: 'Alewife', zh: '酒娘' }, ability: { en: '爪牙被处决时，不会死亡但会醉酒。', zh: '爪牙被处决时，不会死亡但会醉酒。' } }))
      .toBe('Alewife / 酒娘 (minion): 爪牙被处决时，不会死亡但会醉酒。')
  })

  it('skips characters without ability text', () => {
    expect(characterEmbeddingText({ team: 'fabled', name: { en: 'X', zh: 'X' }, ability: { en: MISSING_ABILITY, zh: MISSING_ABILITY } })).toBeNull()
  })
})

describe('core/ai/vectors', () => {
  it('normalizes and survives int8 round trips', () => {
    const v = normalize([3, 4, 0])
    expect([...v].map((x) => +x.toFixed(3))).toEqual([0.6, 0.8, 0])
    const { bytes, scale } = quantize(v)
    expect(bytes).toBeInstanceOf(Int8Array)
    expect(Math.max(...bytes)).toBe(127)
    const back = dequantize(bytes, scale)
    expect(back[0]).toBeCloseTo(0.6, 2)
    expect(back[1]).toBeCloseTo(0.8, 2)
    expect(quantize([0, 0]).scale).toBe(1)
  })

  it('ranks by cosine with filters', () => {
    const index = new VectorIndex(['a', 'b', 'c'], [normalize([1, 0]), normalize([0.8, 0.6]), normalize([0, 1])])
    expect(index.size).toBe(3)
    expect(index.nearest(normalize([1, 0.1]), 2).map((n) => n.id)).toEqual(['a', 'b'])
    expect(index.nearest(normalize([1, 0.1]), 2, (id) => id !== 'a').map((n) => n.id)).toEqual(['b', 'c'])
    expect(index.vectorOf('c')?.[1]).toBeCloseTo(1)
    expect(index.vectorOf('zzz')).toBeUndefined()
    expect(() => index.nearest([1, 0, 0], 1)).toThrow(/dimensions/)
    expect(() => new VectorIndex(['a', 'b'], [normalize([1, 0]), normalize([1, 0, 0])])).toThrow(/dimensions/)
  })
})
