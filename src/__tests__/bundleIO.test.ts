import { beforeEach, describe, expect, it } from 'vitest'
import { SCRIPT_META_KEY, USER_SCRIPTS_KEY } from '../components/StorytellerSub/constants'
import { CUSTOM_CHARACTERS_KEY, REVISION_OVERRIDES_KEY } from '../catalog'
import { applyBundle, buildBundle, validateBundle, type DataBundle } from '../lib/bundleIO'

function bundle(payload: Partial<DataBundle>): DataBundle {
  return {
    type: 'botc-share-bundle',
    version: 1,
    exportedAt: '2026-05-28T00:00:00.000Z',
    ...payload,
  }
}

describe('bundleIO', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('exports only shareable user data and excludes sensitive local keys', () => {
    localStorage.setItem(USER_SCRIPTS_KEY, JSON.stringify([{ slug: 'script-a', title: 'Script A' }]))
    localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify([{ id: 'custom-a', name: 'Custom A' }]))
    localStorage.setItem(REVISION_OVERRIDES_KEY, JSON.stringify({ imp: 'v2' }))
    localStorage.setItem(SCRIPT_META_KEY, JSON.stringify({ 'script-a': { tags: ['favorite'] } }))
    localStorage.setItem('BOTC_AI_SETTINGS', JSON.stringify({ keys: { groq: 'secret-ai-key' } }))
    localStorage.setItem('BOTC_GOOGLE_TOKENS', JSON.stringify({ access_token: 'secret-token' }))
    localStorage.setItem('botc-deal-host-abc123', 'secret-host-token')

    const exported = JSON.stringify(buildBundle({}))

    expect(exported).toContain('script-a')
    expect(exported).toContain('custom-a')
    expect(exported).not.toContain('secret-ai-key')
    expect(exported).not.toContain('secret-token')
    expect(exported).not.toContain('secret-host-token')
  })

  it('merges scripts by slug and preserves unknown future fields', () => {
    localStorage.setItem(USER_SCRIPTS_KEY, JSON.stringify([
      { slug: 'existing', title: 'Existing', futureField: { keep: true } },
    ]))

    applyBundle(bundle({
      scripts: [
        { slug: 'existing', title: 'Incoming Duplicate' },
        { slug: 'new-script', title: 'New Script', futureField: { incoming: true } },
      ],
    }), { mode: 'merge' })

    const scripts = JSON.parse(localStorage.getItem(USER_SCRIPTS_KEY) ?? '[]')
    expect(scripts).toEqual([
      { slug: 'existing', title: 'Existing', futureField: { keep: true } },
      { slug: 'new-script', title: 'New Script', futureField: { incoming: true } },
    ])
  })

  it('merges custom characters by id without duplicating existing entries', () => {
    localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify([
      { id: 'custom-a', name: 'Original' },
    ]))

    applyBundle(bundle({
      customCharacters: [
        { id: 'custom-a', name: 'Duplicate' },
        { id: 'custom-b', name: 'New' },
      ],
    }), { mode: 'merge' })

    const customCharacters = JSON.parse(localStorage.getItem(CUSTOM_CHARACTERS_KEY) ?? '[]')
    expect(customCharacters).toEqual([
      { id: 'custom-a', name: 'Original' },
      { id: 'custom-b', name: 'New' },
    ])
  })

  it('replaces selected bundle fields without touching unselected fields', () => {
    localStorage.setItem(USER_SCRIPTS_KEY, JSON.stringify([{ slug: 'old' }]))
    localStorage.setItem(SCRIPT_META_KEY, JSON.stringify({ old: { tags: ['favorite'] } }))

    const result = applyBundle(bundle({
      scripts: [{ slug: 'new' }],
      scriptMeta: { new: { notes: 'new note' } },
    }), { scripts: true, scriptMeta: false, mode: 'replace' })

    expect(result.scriptsImported).toBe(true)
    expect(result.scriptMetaImported).toBe(false)
    expect(JSON.parse(localStorage.getItem(USER_SCRIPTS_KEY) ?? '[]')).toEqual([{ slug: 'new' }])
    expect(JSON.parse(localStorage.getItem(SCRIPT_META_KEY) ?? '{}')).toEqual({ old: { tags: ['favorite'] } })
  })

  it('rejects structurally invalid bundle fields', () => {
    expect(() => validateBundle(bundle({ scripts: 'not-array' }))).toThrow('Bundle scripts field is invalid')
    expect(() => validateBundle(bundle({ customCharacters: [null] }))).toThrow('Bundle customCharacters field is invalid')
    expect(() => validateBundle(bundle({ revisionOverrides: [] }))).toThrow('Bundle revisionOverrides field is invalid')
    expect(() => validateBundle(bundle({ scriptMeta: [] }))).toThrow('Bundle scriptMeta field is invalid')
  })
})
