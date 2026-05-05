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

export type UiScale = 'default' | 'large' | 'xlarge'

// ── Option catalogs ───────────────────────────────────────────────────────────

export const EN_BODY_OPTIONS: FontOption[] = [
  // ── Google Fonts (project) ─────────────────────────────────────
  {
    id: 'eb-garamond',
    label: 'EB Garamond',
    labelZh: 'EB Garamond · 古典书卷',
    css: '"EB Garamond"',
    sample: 'The Storyteller speaks in shadow.',
    sampleZh: 'The Storyteller speaks in shadow.',
  },
  {
    id: 'merriweather',
    label: 'Merriweather',
    labelZh: 'Merriweather · 清晰正文',
    css: '"Merriweather"',
    sample: 'Demons walk among the townsfolk.',
    sampleZh: 'Demons walk among the townsfolk.',
  },
  {
    id: 'libre-baskerville',
    label: 'Libre Baskerville',
    labelZh: 'Libre Baskerville · 书版衬线',
    css: '"Libre Baskerville"',
    sample: 'Trust no one. Vote carefully.',
    sampleZh: 'Trust no one. Vote carefully.',
  },
  {
    id: 'lato',
    label: 'Lato',
    labelZh: 'Lato · 人文无衬线',
    css: '"Lato"',
    sample: 'Nominations are now open.',
    sampleZh: 'Nominations are now open.',
  },
  {
    id: 'nunito',
    label: 'Nunito',
    labelZh: 'Nunito · 圆润无衬线',
    css: '"Nunito"',
    sample: 'Required votes to execute: 7',
    sampleZh: 'Required votes to execute: 7',
  },
  // ── System fonts ───────────────────────────────────────────────
  {
    id: 'georgia',
    label: 'Georgia',
    labelZh: 'Georgia · 经典衬线',
    css: 'Georgia',
    sample: 'Demons walk among the townsfolk.',
    sampleZh: 'Demons walk among the townsfolk.',
  },
  {
    id: 'times',
    label: 'Times New Roman',
    labelZh: 'Times New Roman · 报纸衬线',
    css: '"Times New Roman", serif',
    sample: 'The demon strikes again tonight.',
    sampleZh: 'The demon strikes again tonight.',
  },
  {
    id: 'system-sans',
    label: 'System Sans',
    labelZh: '系统无衬线',
    css: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    sample: 'Nominations are open.',
    sampleZh: 'Nominations are open.',
  },
  // ── Local project fonts ────────────────────────────────────────
  {
    id: 'times-local',
    label: 'Times New Roman (Local)',
    labelZh: 'Times New Roman · 本地字体',
    css: '"Times New Roman Local", "Times New Roman", serif',
    sample: 'The demon strikes again tonight.',
    sampleZh: 'The demon strikes again tonight.',
  },
  {
    id: 'kaushan',
    label: 'Kaushan Script',
    labelZh: 'Kaushan Script · 手写草体',
    css: '"Kaushan Script", cursive',
    sample: 'Trust no one tonight.',
    sampleZh: 'Trust no one tonight.',
  },
  {
    id: 'edo',
    label: 'Edo',
    labelZh: 'Edo · 装饰英文',
    css: 'Edo, sans-serif',
    sample: 'Blood on the Clocktower',
    sampleZh: 'Blood on the Clocktower',
  },
]

export const EN_DISPLAY_OPTIONS: FontOption[] = [
  // ── Google Fonts (project) ─────────────────────────────────────
  {
    id: 'cinzel',
    label: 'Cinzel',
    labelZh: 'Cinzel · 罗马刻碑',
    css: '"Cinzel"',
    sample: 'Blood on the Clocktower',
    sampleZh: 'Blood on the Clocktower',
  },
  {
    id: 'playfair-display',
    label: 'Playfair Display',
    labelZh: 'Playfair Display · 典雅标题',
    css: '"Playfair Display"',
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
    id: 'libre-baskerville',
    label: 'Libre Baskerville',
    labelZh: 'Libre Baskerville · 书版衬线',
    css: '"Libre Baskerville"',
    sample: 'Blood on the Clocktower',
    sampleZh: 'Blood on the Clocktower',
  },
  // ── System fonts ───────────────────────────────────────────────
  {
    id: 'georgia',
    label: 'Georgia',
    labelZh: 'Georgia · 经典衬线',
    css: 'Georgia',
    sample: 'Blood on the Clocktower',
    sampleZh: 'Blood on the Clocktower',
  },
  {
    id: 'times',
    label: 'Times New Roman',
    labelZh: 'Times New Roman · 报纸衬线',
    css: '"Times New Roman", serif',
    sample: 'Blood on the Clocktower',
    sampleZh: 'Blood on the Clocktower',
  },
  {
    id: 'system-sans',
    label: 'System Sans',
    labelZh: '系统无衬线',
    css: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    sample: 'Blood on the Clocktower',
    sampleZh: 'Blood on the Clocktower',
  },
  // ── Local project fonts ────────────────────────────────────────
  {
    id: 'times-local',
    label: 'Times New Roman (Local)',
    labelZh: 'Times New Roman · 本地字体',
    css: '"Times New Roman Local", "Times New Roman", serif',
    sample: 'Blood on the Clocktower',
    sampleZh: 'Blood on the Clocktower',
  },
  {
    id: 'kaushan',
    label: 'Kaushan Script',
    labelZh: 'Kaushan Script · 手写草体',
    css: '"Kaushan Script", cursive',
    sample: 'Blood on the Clocktower',
    sampleZh: 'Blood on the Clocktower',
  },
  {
    id: 'edo',
    label: 'Edo',
    labelZh: 'Edo · 装饰英文',
    css: 'Edo, sans-serif',
    sample: 'Blood on the Clocktower',
    sampleZh: 'Blood on the Clocktower',
  },
]

export const ZH_OPTIONS: FontOption[] = [
  // ── Google Fonts (project) ─────────────────────────────────────
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
    id: 'zcool-qingke',
    label: 'ZCOOL QingKe HuangYou',
    labelZh: '站酷庆科黄油体 · 活泼圆润',
    css: '"ZCOOL QingKe HuangYou"',
    sample: '血月钟楼',
    sampleZh: '今晚的提名现已开放。',
  },
  {
    id: 'zhi-mang-xing',
    label: 'Zhi Mang Xing',
    labelZh: '芝芒星 · 毛笔行草',
    css: '"Zhi Mang Xing"',
    sample: '血月钟楼',
    sampleZh: '今夜，恶魔再度出击。',
  },
  {
    id: 'noto-serif-sc',
    label: 'Noto Serif SC',
    labelZh: '思源宋体 · 标准宋体',
    css: '"Noto Serif SC"',
    sample: '血月钟楼',
    sampleZh: '提名现已开放，请投票。',
  },
  // ── System fonts ───────────────────────────────────────────────
  {
    id: 'system',
    label: 'System Default',
    labelZh: '系统默认',
    css: '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif',
    sample: '血月钟楼',
    sampleZh: '提名现已开放。',
  },
  // ── Local project fonts ────────────────────────────────────────
  {
    id: 'xingkai',
    label: 'Xingkai 行楷',
    labelZh: '行楷 · 优雅楷书',
    css: 'Xingkai, sans-serif',
    sample: '血月钟楼',
    sampleZh: '说书人低语于暗夜之中。',
  },
  {
    id: 'xinwei',
    label: 'Xinwei 新魏',
    labelZh: '新魏 · 隶变之美',
    css: 'Xinwei, sans-serif',
    sample: '血月钟楼',
    sampleZh: '恶魔行走于镇民之间。',
  },
]

// ── UI scale ──────────────────────────────────────────────────────────────────
export const UI_SCALE_OPTIONS: { id: UiScale; label: string; labelZh: string; px: number }[] = [
  { id: 'default', label: 'Default',  labelZh: '默认',  px: 16 },
  { id: 'large',   label: 'Large',    labelZh: '大',    px: 18 },
  { id: 'xlarge',  label: 'X-Large',  labelZh: '特大',  px: 20 },
]

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULTS = {
  enBody:    'eb-garamond',
  enDisplay: 'cinzel',
  zh:        'zcool-xiaowei',
  uiScale:   'default' as UiScale,
} as const

const STORAGE_KEY = 'botc-font-settings-v2'

// ── CSS var + scale writer ────────────────────────────────────────────────────
function applyFontVars(enBodyCss: string, enDisplayCss: string, zhCss: string, scale: UiScale) {
  const root = document.documentElement
  root.style.setProperty('--font-en-body',    enBodyCss)
  root.style.setProperty('--font-en-display', enDisplayCss)
  root.style.setProperty('--font-zh',         zhCss)
  // Scale HTML root font-size so all rem-based MUI values scale uniformly
  const px = UI_SCALE_OPTIONS.find((o) => o.id === scale)?.px ?? 16
  root.style.fontSize = px === 16 ? '' : `${px}px`
}

function findOption<T extends FontOption>(options: T[], id: string): T {
  return options.find((o) => o.id === id) ?? options[0]
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useFontSettings() {
  const [enBodyId,    setEnBodyId]    = useState<string>(() => loadOrDefault().enBody)
  const [enDisplayId, setEnDisplayId] = useState<string>(() => loadOrDefault().enDisplay)
  const [zhId,        setZhId]        = useState<string>(() => loadOrDefault().zh)
  const [uiScale,     setUiScale]     = useState<UiScale>(() => loadOrDefault().uiScale)

  // Apply CSS vars + persist whenever any selection changes
  useEffect(() => {
    const enBodyCss    = findOption(EN_BODY_OPTIONS,    enBodyId).css
    const enDisplayCss = findOption(EN_DISPLAY_OPTIONS, enDisplayId).css
    const zhCss        = findOption(ZH_OPTIONS,         zhId).css
    applyFontVars(enBodyCss, enDisplayCss, zhCss, uiScale)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        enBody: enBodyId, enDisplay: enDisplayId, zh: zhId, uiScale,
      }))
    } catch {}
  }, [enBodyId, enDisplayId, zhId, uiScale])

  return {
    enBodyId,    setEnBodyId,    enBodyOptions:    EN_BODY_OPTIONS,
    enDisplayId, setEnDisplayId, enDisplayOptions: EN_DISPLAY_OPTIONS,
    zhId,        setZhId,        zhOptions:        ZH_OPTIONS,
    uiScale,     setUiScale,
  }
}

export type FontSettings = ReturnType<typeof useFontSettings>

function loadOrDefault() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        enBody:    parsed.enBody    ?? DEFAULTS.enBody,
        enDisplay: parsed.enDisplay ?? DEFAULTS.enDisplay,
        zh:        parsed.zh        ?? DEFAULTS.zh,
        uiScale:   (parsed.uiScale  ?? DEFAULTS.uiScale) as UiScale,
      }
    }
  } catch {}
  return { ...DEFAULTS }
}
