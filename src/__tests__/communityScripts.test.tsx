/**
 * Community (民间) scripts in assets/scripts/community/ (written by
 * scripts/import-scripts.mjs): every file is valid, names its author and
 * 钟楼剧本博物馆 issue, and loads into the script list as a community script;
 * the list card and the AI's script facts say where it was published; an
 * idiom-like title counts as a mention only in 《》.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// One community script added to the bundled ones: simple characters, idiom title.
vi.mock('../catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../catalog')>()
  const { editableScriptFromData } = await import('../core/script/editable')
  const fixture = editableScriptFromData([
    {
      id: '_meta', name: '一枝独秀', name_zh: '一枝独秀', author: '测试作者', community: true,
      source: { name: '钟楼剧本博物馆', issue: 247, title: '一枝独秀', url: 'https://www.bilibili.com/opus/971924839712423937' },
    },
    'soldier', 'mayor', 'virgin', 'slayer', 'saint', 'tinker', 'klutz', 'pacifist', 'fisherman', 'heretic', 'imp',
  ], { slug: 'museum-247', baseSlug: 'museum-247', sourceFile: 'museum-247.json', edition: 'custom' })
  return { ...actual, initialScripts: [...actual.initialScripts, fixture] }
})

import { initialScripts } from '../catalog'
import { communityScriptSource } from '../core/script/format'
import { validateScript } from '../core/script/validate'
import { getCharacterById } from '../catalog'
import { ScriptCard } from '../components/ScriptsTab/ScriptCard'
import { I18nProvider } from '../context/I18nContext'
import { mostNamedScript } from '../lib/ai/ruleFacts'
import { scriptComplexities, scriptRecommendationFacts } from '../lib/ai/scriptFacts'

const root = path.resolve(__dirname, '../..')
const dir = path.join(root, 'assets/scripts/community')
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : []
const museum = JSON.parse(fs.readFileSync(path.join(root, 'scripts/museum/index.json'), 'utf8'))
const fixture = initialScripts.find((s) => s.slug === 'museum-247')!

describe('assets/scripts/community', () => {
  it('holds valid scripts that name their author and museum issue and load as community scripts', () => {
    const catalog = { getCharacter: (id: string) => getCharacterById(id) }
    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
      const errors = validateScript(data, catalog).issues.filter((i) => i.severity === 'error')
      expect(errors, file).toEqual([])
      const meta = data[0]
      expect(meta, file).toMatchObject({ id: '_meta', community: true, source: { name: '钟楼剧本博物馆' } })
      expect(typeof meta.author, file).toBe('string')
      const issue = museum.issues.find((i: { issue: number }) => i.issue === meta.source.issue)
      expect(issue, file).toBeTruthy()
      expect(meta.source.url, file).toBe(issue.url)
      expect(file).toMatch(new RegExp(`^museum-${issue.issue}(-\\d+)?\\.json$`))
      const loaded = initialScripts.find((s) => s.slug === file.replace(/\.json$/, ''))
      expect(loaded, file).toBeTruthy()
      expect(communityScriptSource(loaded!.meta)?.issue, file).toBe(issue.issue)
    }
  })
})

describe('community scripts in the app', () => {
  it('lists the publication on the script card', () => {
    render(<I18nProvider language="zh"><ScriptCard script={fixture} isActive={false} isBuiltIn language="zh" onSelect={() => {}} /></I18nProvider>)
    expect(screen.getByText(/测试作者 · 钟楼剧本博物馆 第247期 · 11/)).toBeTruthy()
  })

  it('labels community scripts in the AI\'s script facts', () => {
    expect(scriptComplexities().find((s) => s.slug === 'museum-247')?.source).toEqual({ name: '钟楼剧本博物馆', issue: 247 })
    const zh = scriptRecommendationFacts('推荐一个适合新手的剧本', 'zh').join('\n')
    expect(zh).toContain('一枝独秀（museum-247，作者 测试作者，民间剧本，来源 钟楼剧本博物馆 第247期）')
    const en = scriptRecommendationFacts('recommend an easy script for beginners', 'en').join('\n')
    expect(en).toContain('community script from 钟楼剧本博物馆 issue 247')
    // Only the three official scripts are called official.
    expect(scriptRecommendationFacts('推荐一个官方的新手剧本', 'zh').join('\n')).not.toContain('一枝独秀')
  })

  it('counts an idiom-like community title as a mention only in 《》', () => {
    expect(mostNamedScript('这个角色在剧本里一枝独秀。')).toBeUndefined()
    expect(mostNamedScript('可以试试《一枝独秀》。')).toEqual(fixture.characters)
  })
})
