/**
 * Problem reports (src/lib/feedback, src/components/Feedback, docs/FEEDBACK.md):
 * a flag next to a character, a script or a storyteller seat opens a report
 * that carries what it showed and where the user was, and goes to the
 * feedback form. Reading reports back: feedbackTriage.test.ts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider } from '../context/I18nContext'
import { FeedbackButton, FeedbackProvider, useReportContext } from '../components/Feedback'
import { characterRequest, characterSnapshot, plainOptions } from '../lib/feedback/snapshot'
import { recentErrors, recordError } from '../lib/feedback/errors'
import {
  feedbackReport, flushReports, parseReportText, pendingReports, prefilledReportUrl, reportText, sendReport,
  REPORT_FORM, REPORT_JSON_MARKER, type FeedbackReport,
} from '../lib/feedback/report'
import { CHAR_NIGHT_OVERRIDES_KEY, refreshCharNightOverrides } from '../catalog'

const formPosts = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls
  .filter(([url]) => String(url).endsWith(`/forms/d/e/${REPORT_FORM.id}/formResponse`))
  .map(([, init]) => ({ mode: (init as RequestInit).mode, text: ((init as RequestInit).body as URLSearchParams).get(REPORT_FORM.description)! }))

const report = (fields: Partial<Parameters<typeof feedbackReport>[0]> = {}): FeedbackReport => feedbackReport({
  language: 'zh', ...characterRequest('washerwoman', 'characters/detail'), issues: ['translation'], parts: ['ability'], ...fields,
})

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('report text', () => {
  it('reads as a few lines, then the whole report as JSON', () => {
    const r = report({ comment: '“首个夜晚”应为“首夜”', expected: '首夜，你会得知……', selection: '在你的首个夜晚' })
    const text = reportText(r)
    const [readable] = text.split(REPORT_JSON_MARKER)
    expect(readable).toContain(`[BOTC report ${r.id}] Character: Washerwoman / 洗衣妇 (washerwoman) — ability`)
    expect(readable).toContain('Issue: translation')
    expect(readable).toContain('Should be: 首夜，你会得知……')
    expect(readable).toContain('Where: characters/detail · zh')
    expect(parseReportText(text)).toEqual(r)
    expect(r.id).toMatch(/^fb-\d{6}-[a-z0-9]{5}$/)
  })

  it('carries what the character showed in both languages, and local edits', () => {
    localStorage.setItem(CHAR_NIGHT_OVERRIDES_KEY, JSON.stringify({ washerwoman: { firstNightReminderZh: '自定义提示' } }))
    refreshCharNightOverrides()
    const snap = characterSnapshot('washerwoman')
    expect(snap).toMatchObject({
      team: 'townsfolk', edition: 'tb',
      name: { en: 'Washerwoman', zh: '洗衣妇' },
      firstNight: { zh: '自定义提示' },
      localEdits: ['night'],
    })
    expect((snap.ability as { en: string }).en).toContain('1 of 2 players')
    localStorage.clear()
    refreshCharNightOverrides()
  })

  it('never sends the query string, which holds shared scripts and games', () => {
    window.history.pushState({}, '', '/?script=secretpayload#storyteller')
    expect(report().app.path).toBe('/#storyteller')
    window.history.pushState({}, '', '/')
  })

  it('keeps prefilled links short enough for Google, dropping the snapshot first', () => {
    const small = prefilledReportUrl(report())
    expect(small.truncated).toBe(false)
    expect(small.url).toContain(`${REPORT_FORM.description}=`)
    const big = prefilledReportUrl(report({ snapshot: { blob: 'x'.repeat(20_000) } }))
    expect(big.truncated).toBe(true)
    expect(big.url.length).toBeLessThanOrEqual(7_500)
    expect(parseReportText(decodeURIComponent(big.url.split('=').slice(2).join('=')))?.snapshot).toBeUndefined()
  })
})

describe('settings, analytics and print reports', () => {
  it('carry options without images or long lists', () => {
    const options = plainOptions({ shape: 'circle', bgImage: `data:image/png;base64,${'A'.repeat(5000)}`, selectedCharacterIds: Array.from({ length: 40 }, (_, i) => `c${i}`), watermark: { imageData: 'data:image/png;base64,xx', text: 'Club' } })
    expect(options).toEqual({
      shape: 'circle', bgImage: '(image, 5022 chars)',
      selectedCharacterIds: { count: 40, first: Array.from({ length: 30 }, (_, i) => `c${i}`) },
      watermark: { imageData: '(image, 24 chars)', text: 'Club' },
    })
  })

  it('offer their own parts in the dialog', () => {
    render(
      <I18nProvider language="zh">
        <FeedbackProvider>
          <FeedbackButton request={() => ({ target: { type: 'print' }, surface: 'print/tokens', label: '打印工坊', parts: ['tokens'] })} />
        </FeedbackProvider>
      </I18nProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '反馈这里的问题' }))
    expect(screen.getByRole('button', { name: '角色标记' }).getAttribute('aria-pressed')).toBe('true')
    for (const part of ['提示标记', '状态标记', '布局', '剧本单排版', '导出']) expect(screen.getByRole('button', { name: part })).toBeTruthy()
    expect(reportText(feedbackReport({ language: 'zh', target: { type: 'analytics' }, surface: 'analytics/studio', label: '数据统计', issues: ['wrong'], parts: ['players'] })))
      .toContain('Analytics: 数据统计 — players')
  })
})

describe('sending', () => {
  it('posts to the feedback form', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await sendReport(report())).toBe('sent')
    const [post] = formPosts(fetchMock)
    expect(post.mode).toBe('no-cors')
    expect(parseReportText(post.text)?.target).toEqual({ type: 'character', id: 'washerwoman' })
  })

  it('waits offline and goes when back online', async () => {
    const fetchMock = vi.fn(async () => { throw new TypeError('offline') })
    vi.stubGlobal('fetch', fetchMock)
    expect(await sendReport(report())).toBe('queued')
    expect(pendingReports()).toBe(1)
    fetchMock.mockImplementation(async () => new Response(null, { status: 200 }))
    expect(await flushReports()).toBe(0)
    expect(pendingReports()).toBe(0)
  })
})

describe('recent errors', () => {
  it('keeps the last few, once each', () => {
    for (let i = 0; i < 8; i++) recordError(new Error(`boom ${i}`))
    recordError(new Error('boom 7'))
    const errors = recentErrors()
    expect(errors).toHaveLength(5)
    expect(errors.map((e) => e.message)).toEqual(['boom 3', 'boom 4', 'boom 5', 'boom 6', 'boom 7'])
  })
})

function Page({ children }: { children: React.ReactNode }) {
  useReportContext('app', { tab: 'characters', character: 'washerwoman' })
  return <>{children}</>
}

describe('report dialog', () => {
  it('opens from a flag, and sends the issue, the note and what was on screen', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    render(
      <I18nProvider language="zh">
        <FeedbackProvider>
          <Page>
            <p>在你的首个夜晚</p>
            <FeedbackButton request={() => characterRequest('washerwoman', 'characters/detail')} />
          </Page>
        </FeedbackProvider>
      </I18nProvider>,
    )
    // Text selected before pressing the flag goes with the report.
    const range = document.createRange()
    range.selectNodeContents(screen.getByText('在你的首个夜晚'))
    window.getSelection()!.removeAllRanges()
    window.getSelection()!.addRange(range)
    const flag = screen.getByRole('button', { name: '反馈这里的问题' })
    fireEvent.pointerDown(flag)
    window.getSelection()!.removeAllRanges()
    fireEvent.click(flag)

    expect(screen.getByText('反馈：Washerwoman / 洗衣妇 (washerwoman)')).toBeTruthy()
    expect(screen.getByText('在你的首个夜晚', { selector: 'p.MuiTypography-root' })).toBeTruthy()
    const send = screen.getByRole('button', { name: '发送' }) as HTMLButtonElement
    expect(send.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '翻译问题' }))
    fireEvent.click(screen.getByRole('button', { name: '能力' }))
    fireEvent.change(screen.getByLabelText('问题描述'), { target: { value: '用词不统一' } })
    fireEvent.change(screen.getByLabelText('正确内容应为（可选）'), { target: { value: '首夜' } })
    await act(async () => { fireEvent.click(send) })

    expect(screen.getByText('已提交，谢谢！')).toBeTruthy()
    const sent = parseReportText(formPosts(fetchMock)[0].text)!
    expect(sent).toMatchObject({
      target: { type: 'character', id: 'washerwoman' }, surface: 'characters/detail',
      issues: ['translation'], parts: ['ability'], comment: '用词不统一', expected: '首夜',
      selection: '在你的首个夜晚',
      context: { app: { tab: 'characters', character: 'washerwoman' } },
      app: { language: 'zh' },
    })
    expect((sent.snapshot as { name: { zh: string } }).name.zh).toBe('洗衣妇')
  })

  it('shows no flag without a provider (player pages, print previews)', () => {
    render(<I18nProvider language="zh"><FeedbackButton request={() => characterRequest('washerwoman', 'x')} /></I18nProvider>)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
