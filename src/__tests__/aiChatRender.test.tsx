/** How AI answers render in the chat bubble, and model-text clean-up. */
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MdText } from '../components/AiPanel/MdText'
import { splitInlineList, stripThinking } from '../lib/ai/modelText'

afterEach(cleanup)

describe('stripThinking', () => {
  it('drops reasoning blocks and stray tags', () => {
    expect(stripThinking('<think>\n</think>\n没有相关资料。')).toBe('没有相关资料。')
    expect(stripThinking('<think>先想一想……\n很多步</think>\n\n答案')).toBe('答案')
    expect(stripThinking('<think>unfinished reasoning\n\nThe answer.')).toBe('The answer.')
    expect(stripThinking('plain </think> text')).toBe('plain  text')
  })
})

describe('splitInlineList', () => {
  it('puts inline numbered points on their own lines', () => {
    expect(splitInlineList('要注意以下几点：1. 保持轻松。2. 与玩家互动。3. 注意节奏。'))
      .toBe('要注意以下几点：\n1. 保持轻松。\n2. 与玩家互动。\n3. 注意节奏。')
    expect(splitInlineList('Tips: 1. Relax 2. Talk')).toBe('Tips:\n1. Relax\n2. Talk')
  })
  it('leaves versions, decimals and single numbers alone', () => {
    for (const text of ['Qwen3 1.7B 与 0.6B', '第 1. 条', '1. 只有一条', '版本 2.1 和 1.5']) expect(splitInlineList(text)).toBe(text)
  })
})

describe('MdText', () => {
  it('renders tables, links, italics and quotes instead of raw markdown', () => {
    const url = 'https://clocktower-wiki.gstonegames.com/index.php?title=%E7%BB%99%E8%AF%B4%E4%B9%A6%E4%BA%BA%E7%9A%84%E5%BB%BA%E8%AE%AE'
    const { container } = render(<MdText text={[
      '<think>\n</think>',
      '## 标题',
      '| 角色 | 阵营 |',
      '|---|---|',
      '| 洗衣妇 | 镇民 |',
      `来源: ${url}`,
      '_本地模型尚未下载或加载，以上为本地资料。_',
      '> 引用的规则',
      '- 一级',
      '  - 二级 high_priestess',
      '[官方 Wiki](https://wiki.bloodontheclocktower.com/Rules)',
      '[危险](javascript:alert(1))',
    ].join('\n')} />)
    expect(container.textContent).not.toContain('<think>')
    expect(container.querySelector('table')?.textContent).toContain('洗衣妇镇民')
    expect(container.textContent).not.toContain('|---|')
    const links = [...container.querySelectorAll('a')]
    expect(links.map((a) => a.getAttribute('href'))).toEqual([url, 'https://wiki.bloodontheclocktower.com/Rules'])
    expect(links[0].textContent).toMatch(/^clocktower-wiki\.gstonegames.*给说书人的建议$/) // decoded, shortened
    expect(links[0].textContent!.length).toBeLessThan(50)
    expect(screen.getByText('本地模型尚未下载或加载，以上为本地资料。').tagName).toBe('EM')
    expect(container.textContent).toContain('high_priestess') // ids keep their underscores
    expect(container.querySelector('a[href^="javascript"]')).toBeNull() // shown as text, never a link
    expect(screen.getByText('引用的规则')).toBeInTheDocument()
  })
})
