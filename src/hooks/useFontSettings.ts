import { useEffect, useState } from 'react'

// ── Font option types ─────────────────────────────────────────────────────────
export interface FontOption {
  id: string
  label: string
  labelZh: string
  /** Value written to the CSS var — just the family name(s), no stack */
  css: string
  /** Sample text to preview in this font */
  sample: string
  sampleZh: string
}

// ── Option catalogs ───────────────────────────────────────────────────────────
export const EN_BODY_OPTIONS: FontOption[] = [
  {
    id: 'eb-garamond',
    label: 'EB Garamond',
    labelZh: 'EB Garamond · 古典书卷',
    css: '"EB Garamond"',
    sample: 'The Storyteller speaks in shadow.',
    sampleZh: 'The Storyteller speaks in shadow.',
  },
  {
    id: 'cinzel',
    label: 'Cinzel',
    labelZh: 'Cinzel · 罗马刻碑',
    css: '"Cinzel"',
    sample: 'Blood on the Clocktower',
    sampleZh: 'Blood on the Clocktower',
  },
  {
    id: 'georgia',
    label: 'Georgia',
    labelZh: 'Georgia · 经典衬线',
    css: 'Georgia',
    sample: 'Demons walk among the townsfolk.',
    sampleZh: 'Demons walk among the townsfolk.',
  },
  {
    id: 'system-sans',
    label: 'System Sans',
    labelZh: '系统无衬线',
    css: '-apple-system, BlinkMacSystemFont, "Segoe UI"',
    sample: 'Nominations are open.',
    sampleZh: 'Nominations are open.',
  },
]

export const EN_DISPLAY_OPTIONS: FontOption[] = [
  {
    id: 'cinzel',
    label: 'Cinzel',
    labelZh: 'Cinzel · 罗马刻碑',
    css: '"Cinzel"',
    sample: 'Blood on the Clocktower',
    sampleZh: 'Blood on the Clocktower',
  },
  {
    id: 'eb-garamond',
    label: 'EB Garamond',
    labelZh: 'EB Garamond · 古典书卷',
    css: '"EB Garamond"',
    sample: 'Blood on the Clocktower',
    sampleZh: 'Blood on the Clocktower',
  },
  {
    id: 'georgia',
    label: 'Georgia',
    labelZh: 'Georgia · 经典衬线',
    css: 'Georgia',
    sample: 'Blood on the Clocktower',
    sampleZh: 'Blood on the Clocktower',
  },
]

export const ZH_OPTIONS: FontOption[] = [
  {
    id: 'zcool-xiaowei',
    label: 'ZCOOL XiaoWei',
    labelZh: '站酷小薇 · 优雅文学',
    css: '"ZCOOL XiaoWei"',
    sample: '血月钟楼',
    sampleZh: '说书人在黑暗中低语。',
  },
  {
    id: 'ma-shan-zheng',
    label: 'Ma Shan Zheng',
    labelZh: '马善政楷体 · 书法笔意',
    css: '"Ma Shan Zheng"',
    sample: '血月钟楼',
    sampleZh: '恶魔行走于镇民之间。',
  },
  {
    id: 'system',
    label: 'System Default',
    labelZh: '系统默认',
    css: '"PingFang SC", "Noto Sans SC", "Microsoft YaHei"',
    sample: '血月钟楼',
    sampleZh: '提名现已开放。',
  },
]

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULTS = {
  enBody:    'eb-garamond',
  enDisplay: 'cinzel',
  zh:        'zcool-xiaowei',
} as const

const STORAGE_KEY = 'botc-font-settings-v1'

// ── CSS var writer ────────────────────────────────────────────────────────────
function applyFontVars(enBodyCss: string, enDisplayCss: string, zhCss: string) {
  const root = document.documentElement
  root.style.setProperty('--font-en-body',    enBodyCss)
  root.style.setProperty('--font-en-display', enDisplayCss)
  root.style.setProperty('--font-zh',         zhCss)
}

function findOption<T extends FontOption>(options: T[], id: string): T {
  return options.find((o) => o.id === id) ?? options[0]
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useFontSettings() {
  const [enBodyId,    setEnBodyId]    = useState<string>(() => loadOrDefault().enBody)
  const [enDisplayId, setEnDisplayId] = useState<string>(() => loadOrDefault().enDisplay)
  const [zhId,        setZhId]        = useState<string>(() => loadOrDefault().zh)

  // Apply CSS vars + persist whenever any selection changes
  useEffect(() => {
    const enBodyCss    = findOption(EN_BODY_OPTIONS,    enBodyId).css
    const enDisplayCss = findOption(EN_DISPLAY_OPTIONS, enDisplayId).css
    const zhCss        = findOption(ZH_OPTIONS,         zhId).css
    applyFontVars(enBodyCss, enDisplayCss, zhCss)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enBody: enBodyId, enDisplay: enDisplayId, zh: zhId }))
    } catch {}
  }, [enBodyId, enDisplayId, zhId])

  return {
    enBodyId,    setEnBodyId,    enBodyOptions:    EN_BODY_OPTIONS,
    enDisplayId, setEnDisplayId, enDisplayOptions: EN_DISPLAY_OPTIONS,
    zhId,        setZhId,        zhOptions:        ZH_OPTIONS,
  }
}

export type FontSettings = ReturnType<typeof useFontSettings>

function loadOrDefault(): typeof DEFAULTS {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) }
  } catch {}
  return { ...DEFAULTS }
}
