import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Badge,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  CircularProgress,
  Container,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy'
import QueryStatsIcon from '@mui/icons-material/QueryStats'
import PrintIcon from '@mui/icons-material/Print'
import TuneIcon from '@mui/icons-material/Tune'
import BugReportIcon from '@mui/icons-material/BugReport'
import CloudDoneIcon from '@mui/icons-material/CloudDone'
import CloudOffIcon from '@mui/icons-material/CloudOff'
import CloudSyncIcon from '@mui/icons-material/CloudSync'
import InfoIcon from '@mui/icons-material/Info'
import SyncProblemIcon from '@mui/icons-material/SyncProblem'
import HistoryIcon from '@mui/icons-material/History'
import { ChangelogPage } from './components/ChangelogPage'
import { PrintPreviewPage } from './components/PrintPreviewPage'
import { DEFAULT_PRINT_OPTIONS } from './components/PrintOptionsDialog'
import type { PrintOptions } from './components/PrintOptionsDialog'
import { PrintStudioPage } from './components/PrintStudio/PrintStudioPage'
import { DEFAULT_TOKEN_OPTIONS } from './components/PrintStudio/types'
import type { TokenPrintOptions } from './components/PrintStudio/types'
import { ScriptsTab } from './components/tabs/ScriptsTab'
import { CharactersTab } from './components/tabs/CharactersTab'
import { AnalyticsTab } from './components/tabs/AnalyticsTab'
import { SettingsTab } from './components/tabs/SettingsTab'
import { StorytellerHelper } from './components/StorytellerHelper'
import { useFontSettings } from './hooks/useFontSettings'
import {
  allCharacters,
  characterById,
  CUSTOM_CHARACTERS_KEY,
  createScriptPayload,
  editionLabels,
  getAbilityText,
  getAbilityTextForScript,
  getCharacterById,
  getCustomChar,
  getDisplayName,
  getEffectiveAllCharacters,
  initialScripts,
  locales,
  parseScriptFromData,
  registerCustomCharacters,
  teamOrder,
  toTitleCase,
} from './catalog'
import { STORAGE_KEY, USER_SCRIPTS_KEY, SCRIPT_META_KEY, RECORDS_CHANGED_EVENT } from './components/StorytellerSub/constants'
import { useCloudSync } from './hooks/useCloudSync'
import { getClientId } from './lib/googleAuth'
import type { SyncStatus } from './hooks/useCloudSync'
import { useShareParam } from './hooks/useShareParam'
import type { TabKey } from './hooks/useShareParam'


type ScriptMeta = { tags?: string[]; notes?: string; pinnedRevisions?: Record<string, string> }
import { storageSync } from './lib/storage'
import { exportGameFile } from './lib/exportGame'
import type {
  CharacterGroup,
  CustomCharacter,
  EditableScript,
  Language,
  ResolvedScriptCharacter,
  ResolvedScriptCharacterGroup,
  Team,
} from './types'
import { useThemeMode } from './context/ThemeMode'

// ── Cloud sync header badge ────────────────────────────────────────────────────

interface CloudSyncBadgeProps {
  connected: boolean
  status: SyncStatus
  lastSynced: Date | null
  errorMessage: string | null
  language: Language
  onPress: () => void
}

function CloudSyncBadge({ connected, status, lastSynced, errorMessage, language, onPress }: CloudSyncBadgeProps) {
  const isZh = language === 'zh'
  const isBusy = status === 'syncing' || status === 'pulling' || status === 'pushing'
  const isError = status === 'error'
  const isConfigured = !!getClientId()

  let icon: React.ReactNode
  let dotColor: string
  let tooltipLines: string[]

  if (!isConfigured) {
    icon = <CloudOffIcon fontSize="small" sx={{ color: 'text.disabled' }} />
    dotColor = 'transparent'
    tooltipLines = [isZh ? '云同步未配置' : 'Cloud sync not configured', isZh ? '在设置中输入 Google Client ID' : 'Enter Google Client ID in Settings']
  } else if (!connected) {
    icon = <CloudOffIcon fontSize="small" sx={{ color: 'text.secondary' }} />
    dotColor = 'grey.400'
    tooltipLines = [isZh ? '未连接 Google Drive' : 'Not connected to Google Drive', isZh ? '点击前往设置' : 'Click to go to Settings']
  } else if (isError) {
    icon = <SyncProblemIcon fontSize="small" sx={{ color: 'error.main' }} />
    dotColor = 'error.main'
    tooltipLines = [
      isZh ? '同步出错' : 'Sync error',
      errorMessage ?? (isZh ? '未知错误' : 'Unknown error'),
    ]
  } else if (isBusy) {
    icon = <CloudSyncIcon fontSize="small" sx={{ color: 'primary.main' }} />
    dotColor = 'primary.main'
    tooltipLines = [
      status === 'pulling' ? (isZh ? '正在拉取数据…' : 'Pulling from Drive…')
        : status === 'pushing' ? (isZh ? '正在推送数据…' : 'Pushing to Drive…')
        : (isZh ? '正在同步…' : 'Syncing…'),
    ]
  } else {
    // connected + idle
    icon = <CloudDoneIcon fontSize="small" sx={{ color: 'success.main' }} />
    dotColor = 'success.main'
    tooltipLines = [
      isZh ? '已连接 Google Drive' : 'Connected to Google Drive',
      lastSynced
        ? (isZh ? `上次同步: ${lastSynced.toLocaleTimeString()}` : `Last synced: ${lastSynced.toLocaleTimeString()}`)
        : (isZh ? '尚未同步' : 'Not yet synced'),
    ]
  }

  return (
    <Tooltip title={<Box>{tooltipLines.map((l, i) => <div key={i}>{l}</div>)}</Box>}>
      <IconButton size="small" onClick={onPress} sx={{ position: 'relative' }}>
        <Badge
          variant="dot"
          sx={{
            '& .MuiBadge-dot': {
              bgcolor: dotColor,
              boxShadow: '0 0 0 1.5px var(--Paper-overlay, #fff)',
            },
          }}
          invisible={dotColor === 'transparent'}
        >
          {icon}
        </Badge>
        {isBusy && (
          <CircularProgress
            size={28}
            thickness={2}
            sx={{ position: 'absolute', top: 4, left: 4, color: 'primary.main', pointerEvents: 'none' }}
          />
        )}
      </IconButton>
    </Tooltip>
  )
}

export default function App() {
  const { mode: themeMode } = useThemeMode()
  const cloudSync = useCloudSync()
  const { scheduleSync } = cloudSync
  const { activeTab, setActiveTab, sharedAnalyticsRecords, shareDecodeError, clearSharedRecords } = useShareParam()

  const [showChangelog, setShowChangelog] = useState(false)

  // Keep heavy tabs mounted once visited — avoids re-initialization cost on switch
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(() => new Set([activeTab]))
  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.has(activeTab)) return prev
      return new Set([...prev, activeTab])
    })
  }, [activeTab])

  const [uiLanguage, setUiLanguage] = useState<Language>(() => {
    try { return (localStorage.getItem('botc-ui-language') as Language) ?? 'zh' } catch { return 'zh' }
  })
  useEffect(() => {
    try { localStorage.setItem('botc-ui-language', uiLanguage) } catch {}
  }, [uiLanguage])
  const initialSlugs = useMemo(() => new Set(initialScripts.map((s) => s.slug)), [])
  const [scripts, setScripts] = useState<EditableScript[]>(() => {
    try {
      const user = (() => {
        const stored = storageSync.getItem(USER_SCRIPTS_KEY)
        return stored ? (JSON.parse(stored) as EditableScript[]) : []
      })()
      const meta = (() => {
        try { return JSON.parse(localStorage.getItem(SCRIPT_META_KEY) ?? '{}') as Record<string, ScriptMeta> } catch { return {} as Record<string, ScriptMeta> }
      })()
      const applyMeta = (s: EditableScript): EditableScript => {
        const m = meta[s.slug]
        if (!m) return s
        return {
          ...s,
          ...(m.tags !== undefined ? { tags: m.tags } : {}),
          ...(m.notes !== undefined ? { notes: m.notes } : {}),
          ...(m.pinnedRevisions !== undefined ? { pinnedRevisions: m.pinnedRevisions } : {}),
        }
      }
      return [...initialScripts.map(applyMeta), ...user.map(applyMeta)]
    } catch {}
    return initialScripts
  })
  const [activeSlug, setActiveSlug] = useState<string>(initialScripts[0]?.slug ?? '')

  // ST has its own independent script selection — not shared with Scripts tab
  const [stActiveSlug, setStActiveSlug] = useState<string>(() => {
    try {
      const stored = storageSync.getItem(STORAGE_KEY)
      if (stored) {
        const p = JSON.parse(stored)
        if (p.activeScriptSlug) return p.activeScriptSlug
      }
    } catch {}
    return initialScripts[0]?.slug ?? ''
  })
  useEffect(() => {
    const user = scripts.filter((s) => !initialSlugs.has(s.slug))
    storageSync.setItem(USER_SCRIPTS_KEY, JSON.stringify(user))

    // Persist tags/notes/pinnedRevisions for ALL scripts (incl. built-ins)
    const meta: Record<string, ScriptMeta> = {}
    for (const s of scripts) {
      const m: ScriptMeta = {}
      if (s.tags?.length) m.tags = s.tags
      if (s.notes?.trim()) m.notes = s.notes
      if (s.pinnedRevisions && Object.keys(s.pinnedRevisions).length) m.pinnedRevisions = s.pinnedRevisions
      if (Object.keys(m).length) meta[s.slug] = m
    }
    try { localStorage.setItem(SCRIPT_META_KEY, JSON.stringify(meta)) } catch {}
    scheduleSync()
  }, [scripts, initialSlugs, scheduleSync])

  // ── Custom characters ─────────────────────────────────────────────────────
  const [customChars, setCustomChars] = useState<CustomCharacter[]>(() => {
    try {
      const chars = JSON.parse(localStorage.getItem(CUSTOM_CHARACTERS_KEY) ?? '[]') as CustomCharacter[]
      registerCustomCharacters(chars) // sync init so catalog fns work on first render
      return chars
    } catch {
      return []
    }
  })
  useEffect(() => {
    registerCustomCharacters(customChars)
    localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(customChars))
    scheduleSync()
  }, [customChars, scheduleSync])

  // Pending custom char ID from ScriptEditor's "Create custom" action
  const [pendingCustomCharId, setPendingCustomCharId] = useState<string | null>(null)

  // Sync when game records change (written directly by Analytics/Storyteller, not via React state)
  useEffect(() => {
    const handler = () => scheduleSync()
    window.addEventListener(RECORDS_CHANGED_EVENT, handler)
    return () => window.removeEventListener(RECORDS_CHANGED_EVENT, handler)
  }, [scheduleSync])

  const [characterQuery, setCharacterQuery] = useState('')
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([])
  const [selectedEditions, setSelectedEditions] = useState<string[]>([])
  const [editorQuery, setEditorQuery] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  useEffect(() => { setIsEditMode(false) }, [activeSlug])
  const [showWakeOrderPreview, setShowWakeOrderPreview] = useState(true)
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false)
  const [printOptions, setPrintOptions] = useState<PrintOptions>(DEFAULT_PRINT_OPTIONS)
  const [tokenPrintOptions, setTokenPrintOptions] = useState<TokenPrintOptions>(DEFAULT_TOKEN_OPTIONS)
  const [saveStatus, setSaveStatus] = useState('')
  const [showDescription, setShowDescription] = useState(false)
  const [tabMenuAnchor, setTabMenuAnchor] = useState<null | HTMLElement>(null)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(allCharacters[0]?.id ?? '')

  const activeScript = useMemo(
    () => scripts.find((s) => s.slug === activeSlug) ?? scripts[0],
    [activeSlug, scripts],
  )

  const uiText = useMemo(() => {
    const ui = locales[uiLanguage].ui
    if (!ui) throw new Error(`Missing ui locale: ${uiLanguage}`)
    const req = (key: string) => {
      const v = ui[key]
      if (!v) throw new Error(`Missing ui locale string: ${uiLanguage}.${key}`)
      return v
    }
    return {
      appTitle: req('app_title'), appLead: req('app_lead'), print: req('print'),
      scriptSheet: req('script_sheet'), settings: req('settings'), allCharacters: req('all_characters'),
      newScript: req('new_script'), editScript: req('edit_script'), doneEditing: req('done_editing'),
      downloadJson: req('download_json'), noScripts: req('no_scripts'), pdfSettings: req('pdf_settings'),
      currentScript: req('current_script'), fontSize: req('font_size'), fontSizePt: req('font_size_pt'),
      reset: req('reset'), preview: req('preview'), wakeOrderToggle: req('wake_order_toggle'),
      wakeOrderNote: req('wake_order_note'), resultsSuffix: req('results_suffix'),
      searchCharacters: req('search_characters'), title: req('title'), chineseTitle: req('chinese_title'),
      author: req('author'), bootleggerRules: req('bootlegger_rules'), bootleggerRulesHelp: req('bootlegger_rules_help'),
      bootleggerRulesZh: req('bootlegger_rules_zh'), bootleggerRulesZhHelp: req('bootlegger_rules_zh_help'),
      bootleggerRulePlaceholder: req('bootlegger_rule_placeholder'), bootleggerRuleZhPlaceholder: req('bootlegger_rule_zh_placeholder'),
      scriptJinxes: req('script_jinxes'), scriptJinxesHelp: req('script_jinxes_help'),
      jinxPairId: req('jinx_pair_id'), jinxPairPlaceholder: req('jinx_pair_placeholder'),
      jinxStatus: req('jinx_status'), jinxStatusActive: req('jinx_status_active'), jinxStatusInactive: req('jinx_status_inactive'),
      jinxReasonEnPlaceholder: req('jinx_reason_en_placeholder'), jinxReasonZhPlaceholder: req('jinx_reason_zh_placeholder'),
      addJinx: req('add_jinx'), addRule: req('add_rule'), remove: req('remove'), custom: req('custom'),
      editionLabel: req('edition_label'), characterSearch: req('character_search'), filterCharacters: req('filter_characters'),
      export: req('export'), language: req('language'), english: req('english'), chinese: req('chinese'),
      characterVersions: req('character_versions'), currentRevision: req('current_revision'),
      revisionHistory: req('revision_history'), revisionNote: req('revision_note'),
      englishText: req('english_text'), chineseText: req('chinese_text'), current: req('current'),
      noCharacterSelected: req('no_character_selected'), availableCharacters: req('available_characters'),
      selectedCharacters: req('selected_characters'), selectedCount: req('selected_count'), noCharacters: req('no_characters'),
    }
  }, [uiLanguage])

  const getScriptTitle = (script: EditableScript) =>
    uiLanguage === 'zh' ? script.titleZh || script.title : script.title

  const getSheetUiLabel = (language: Language, key: string) => {
    const value = locales[language].ui?.[key]
    if (!value) throw new Error(`Missing ui locale string: ${language}.${key}`)
    return value
  }

  const activeScriptCharacters = useMemo<ResolvedScriptCharacter[]>(() => {
    if (!activeScript) return []
    // inline customCharacters in the script JSON
    const scriptCustomById = new Map(activeScript.customCharacters.map((c) => [c.id, c]))
    return activeScript.characters
      .map<ResolvedScriptCharacter | null>((id) => {
        const cat = characterById[id]
        const scriptCustom = scriptCustomById.get(id)
        // also check the global custom char registry (user-created via CharactersTab)
        const globalCustom = getCustomChar(id)
        if (!cat && !scriptCustom && !globalCustom) return null
        return {
          id,
          team: scriptCustom?.team ?? globalCustom?.team ?? cat?.team ?? 'townsfolk',
          edition: scriptCustom?.edition ?? globalCustom?.edition ?? cat?.edition ?? activeScript.edition,
          current_revision: cat?.current_revision,
          revisions: cat?.revisions,
          jinxes: scriptCustom?.jinxes ?? globalCustom?.jinxes ?? cat?.jinxes,
          name: scriptCustom?.name ?? (globalCustom ? getDisplayName(id, uiLanguage) : undefined),
          ability: scriptCustom?.ability ?? (globalCustom
            ? getAbilityText(id, uiLanguage)
            : cat ? getAbilityTextForScript(id, uiLanguage, activeScript.pinnedRevisions) : undefined),
          image: scriptCustom?.image ?? (globalCustom?.icon ? globalCustom.icon : undefined),
        }
      })
      .filter((c): c is ResolvedScriptCharacter => c !== null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScript, customChars, uiLanguage])

  const groupedScriptCharacters = useMemo<ResolvedScriptCharacterGroup[]>(
    () => teamOrder
      .map((team) => ({ team, characters: activeScriptCharacters.filter((c) => c.team === team) }))
      .filter((g) => g.characters.length > 0),
    [activeScriptCharacters],
  )

  const sheetDensityClass = useMemo(() => {
    const count = activeScriptCharacters.length
    if (count >= 25) return 'sheet--dense'
    if (count >= 18) return 'sheet--compact'
    return ''
  }, [activeScriptCharacters.length])

  // Keep registry in sync with React state before any memos read from it.
  // useEffect fires after render — too late for useMemo. Calling here is safe
  // because registerCustomCharacters is idempotent and has no DOM side-effects.
  registerCustomCharacters(customChars)

  const availableEditions = useMemo(
    () => Array.from(new Set(getEffectiveAllCharacters().map((c) => c.edition))).sort(
      (a, b) => (editionLabels[uiLanguage][a] ?? toTitleCase(a)).localeCompare(editionLabels[uiLanguage][b] ?? toTitleCase(b)),
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uiLanguage, customChars],
  )

  const tabDescriptions: Record<TabKey, { en: string; zh: string }> = {
    scripts: {
      en: 'Browse, edit, and export BOTC script PDFs. Select characters and customize your game sheet.',
      zh: '浏览、编辑和导出 BOTC 剧本 PDF。选择角色并自定义你的游戏卡片。',
    },
    characters: {
      en: 'Complete character catalog with search and filter. View all official and custom character abilities.',
      zh: '完整的角色目录，支持搜索和筛选。查看所有官方和自定义角色能力。',
    },
    storyteller: {
      en: 'Game orchestration tool for storytellers. Manage night phases, nominations, votes, and game history.',
      zh: '说书人游戏管理工具。管理夜晚阶段、提名、投票和游戏历史记录。',
    },
    analytics: {
      en: 'Track and analyze your BOTC game statistics. View trends and export game records.',
      zh: '追踪和分析你的 BOTC 游戏统计数据。查看趋势并导出游戏记录。',
    },
    printstudio: {
      en: 'Advanced print layout designer. Create custom character tokens and print materials.',
      zh: '高级打印布局设计器。创建自定义角色令牌和打印材料。',
    },
    settings: {
      en: 'Customize fonts and appearance. Changes apply globally and persist across sessions.',
      zh: '自定义字体和外观。设置全局生效并在会话间持久保存。',
    },
  }

  const disclaimerText = uiLanguage === 'zh'
    ? '本网站仅供社区使用，非商业用途。'
    : 'This website is for community use only, not for commercial purposes.'

  const currentDescription = tabDescriptions[activeTab]?.[uiLanguage === 'zh' ? 'zh' : 'en'] ?? ''

  const filteredCharacters = useMemo(() => {
    const tokens = characterQuery.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return getEffectiveAllCharacters().filter((c) => {
      const nameEn = getDisplayName(c.id, 'en').toLowerCase()
      const nameZh = getDisplayName(c.id, 'zh').toLowerCase()
      const abilityEn = getAbilityText(c.id, 'en').toLowerCase()
      const abilityZh = getAbilityText(c.id, 'zh').toLowerCase()
      const idLower = c.id.toLowerCase()
      // AND: every token must match at least one field
      const matchesQuery = tokens.length === 0 || tokens.every(
        (t) => nameEn.includes(t) || nameZh.includes(t) || abilityEn.includes(t) || abilityZh.includes(t) || idLower.includes(t)
      )
      const matchesTeam = selectedTeams.length === 0 || selectedTeams.includes(c.team)
      const matchesEdition = selectedEditions.length === 0 || selectedEditions.includes(c.edition)
      return matchesQuery && matchesTeam && matchesEdition
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterQuery, selectedEditions, selectedTeams, customChars])

  const filteredEditorCharacters = useMemo(() => {
    const query = editorQuery.trim().toLowerCase()
    return getEffectiveAllCharacters().filter((c) =>
      !query ||
      getDisplayName(c.id, 'en').toLowerCase().includes(query) ||
      getDisplayName(c.id, 'zh').toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query) ||
      getAbilityText(c.id, 'en').toLowerCase().includes(query) ||
      getAbilityText(c.id, 'zh').toLowerCase().includes(query),
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorQuery, customChars])

  const groupedEditorCharacters = useMemo<CharacterGroup[]>(
    () => teamOrder
      .map((team) => ({ team, characters: filteredEditorCharacters.filter((c) => c.team === team) }))
      .filter((g) => g.characters.length > 0),
    [filteredEditorCharacters],
  )

  const selectedCharacter = (getCharacterById(selectedCharacterId) ?? filteredCharacters[0] ?? allCharacters[0])

  useEffect(() => {
    if (selectedCharacter) setSelectedCharacterId(selectedCharacter.id)
  }, [selectedCharacter?.id])

  function updateActiveScript(updater: (s: EditableScript) => EditableScript, nextSlug?: string) {
    if (!activeScript) return
    setScripts((cur) => cur.map((s) => s.slug === activeScript.slug ? updater(s) : s))
    if (nextSlug && nextSlug !== activeScript.slug) setActiveSlug(nextSlug)
  }

  function importScriptFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { setSaveStatus('Import failed: file too large (max 5 MB)'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        const imported = parseScriptFromData(data, file.name)
        let slug = imported.slug
        let counter = 2
        while (scripts.some((s) => s.slug === slug)) { slug = `${imported.slug}-${counter}`; counter++ }
        const unique = { ...imported, slug }
        setScripts((cur) => [...cur, unique])
        setActiveSlug(unique.slug)
        setSaveStatus(`Imported: ${unique.title}`)
      } catch {
        setSaveStatus('Import failed: invalid JSON')
      }
    }
    reader.readAsText(file)
  }

  function createNewScript() {
    const baseSlug = 'new-script'
    let nextSlug = baseSlug
    let index = 2
    while (scripts.some((s) => s.slug === nextSlug)) { nextSlug = `${baseSlug}-${index}`; index++ }
    const next: EditableScript = {
      slug: nextSlug, title: 'New Script', titleZh: 'New Script', author: '',
      version: '1.0',
      meta: { id: '_meta', name: 'New Script' }, customCharacters: [],
      edition: 'custom', characters: [], sourceFile: `${nextSlug}.json`,
    }
    setScripts((cur) => [...cur, next])
    setActiveSlug(nextSlug)
    setSaveStatus('')
  }

  function duplicateScript(slug: string) {
    const source = scripts.find((s) => s.slug === slug)
    if (!source) return
    const baseSlug = `${slug}-copy`
    let nextSlug = baseSlug
    let index = 2
    while (scripts.some((s) => s.slug === nextSlug)) { nextSlug = `${baseSlug}-${index}`; index++ }
    const copy: EditableScript = {
      ...JSON.parse(JSON.stringify(source)),
      slug: nextSlug,
      sourceFile: `${nextSlug}.json`,
    }
    setScripts((cur) => [...cur, copy])
    setActiveSlug(nextSlug)
    setSaveStatus('')
  }

  function deleteScript(slug: string) {
    if (initialSlugs.has(slug)) return
    setScripts((cur) => cur.filter((s) => s.slug !== slug))
    if (activeSlug === slug) {
      setActiveSlug(scripts.find((s) => s.slug !== slug)?.slug ?? initialScripts[0]?.slug ?? '')
    }
  }

  function downloadScriptFile() {
    if (!activeScript) return
    const safeName = (activeScript.title || activeScript.slug || 'script').replace(/[^a-zA-Z0-9_一-鿿\- ]/g, '').trim().replace(/\s+/g, '_')
    const versionSuffix = activeScript.version ? `_v${activeScript.version}` : ''
    const filename = `${safeName}${versionSuffix}.json`
    const payload = JSON.stringify(createScriptPayload(activeScript), null, 2)
    exportGameFile(payload, filename)
    setSaveStatus(`Downloaded ${filename}`)
  }

  function toggleCharacterInScript(characterId: string) {
    updateActiveScript((s) => ({
      ...s,
      characters: s.characters.includes(characterId)
        ? s.characters.filter((id) => id !== characterId)
        : [...s.characters, characterId],
    }))
  }

  const fontSettings = useFontSettings()
  const theme = useTheme()
  const isMobileView = useMediaQuery(theme.breakpoints.down('sm'))

  // Body overflow: storyteller on mobile needs overflow:hidden for its full-screen layout.
  // Managed here (not in StorytellerHelper) because ST stays mounted across tab switches.
  useEffect(() => {
    const needsLock = activeTab === 'storyteller' && isMobileView
    document.body.style.overflow = needsLock ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [activeTab, isMobileView])

  // Scroll to top on every tab switch so the header is never off-screen
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [activeTab])

  const stTabLabel = uiLanguage === 'zh' ? '主持助手' : 'Storyteller Helper'
  const psTabLabel = uiLanguage === 'zh' ? '打印工坊' : 'Print Studio'
  const anTabLabel = uiLanguage === 'zh' ? '数据统计' : 'Analytics'
  const stgTabLabel = uiLanguage === 'zh' ? '设置' : 'Settings'

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 0, sm: 3 }, px: { xs: 0, sm: 3 }, minHeight: '100vh', pb: { xs: '56px', sm: 0 } }}>
      {/* Hide header on mobile storyteller — MobileTopBar is the header there.
          Height: 100dvh in StorytellerHelper needs the viewport to start at y=0. */}
      <Paper elevation={1} sx={{
        mb: { xs: 0, sm: 2 },
        borderRadius: { xs: 0, sm: 2 },
        overflow: 'hidden',
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: (activeTab === 'storyteller' && isMobileView) ? 'none' : undefined,
      }}>
        {/* ── Title + Tabs row ── */}
        <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.25, sm: 1.5 }, display: 'flex', alignItems: 'center', gap: 2 }}>

          {/* Brand — icon + title */}
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0,
                cursor: { xs: 'pointer', sm: 'default' } }}
              onClick={(e) => setTabMenuAnchor(e.currentTarget as HTMLElement)}
            >
              <Box component="img"
                src={themeMode === 'dark' ? 'icons/icon-80.png' : 'appIcon.png'}
                alt="BOTC Companion"
                sx={{
                  width: { xs: 28, sm: 34 }, height: { xs: 28, sm: 34 },
                  flexShrink: 0, borderRadius: 1,
                  // Dark: boost brightness + slight warm tint so dark artwork is legible on dark surface
                  // Light: slight warm desaturate to blend with parchment header
                  filter: themeMode === 'dark'
                    ? 'brightness(1.4) contrast(0.9) saturate(1.1) drop-shadow(0 1px 3px rgba(0,0,0,0.6))'
                    : 'brightness(0.92) saturate(0.85) sepia(0.08)',
                }} />
              <Typography component="h1"
                sx={{ fontFamily: 'inherit', m: 0,
                  fontWeight: 700, userSelect: 'none',
                  fontSize: { xs: '1.05rem', sm: '1.25rem' },
                  letterSpacing: '-0.01em',
                  color: 'text.primary',
                  '&:hover': { color: { xs: 'primary.dark', sm: 'text.primary' } },
                }}
              >
                {uiText.appTitle}
              </Typography>
            </Box>

          {/* Tabs — desktop */}
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              display: { xs: 'none', sm: 'flex' },
              '& .MuiTab-root': { minWidth: 0, px: 1 },
            }}
          >
            <Tab icon={<DescriptionIcon fontSize="small" />} value="scripts" aria-label={uiText.scriptSheet} title={uiText.scriptSheet} />
            <Tab icon={<TheaterComedyIcon fontSize="small" />} value="characters" aria-label={uiText.allCharacters} title={uiText.allCharacters} />
            <Tab icon={<MenuBookIcon fontSize="small" />} value="storyteller" aria-label={stTabLabel} title={stTabLabel} />
            <Tab icon={<QueryStatsIcon fontSize="small" />} value="analytics" aria-label={anTabLabel} title={anTabLabel} />
            <Tab icon={<PrintIcon fontSize="small" />} value="printstudio" aria-label={psTabLabel} title={psTabLabel} />
            <Tab icon={<TuneIcon fontSize="small" />} value="settings" aria-label={stgTabLabel} title={stgTabLabel} />
          </Tabs>

          {/* Mobile: active tab name with icon — hidden now (bottom nav replaces) */}
          <Box
            sx={{ display: 'none', flex: 1, alignItems: 'center', gap: 0.5, cursor: 'pointer', userSelect: 'none' }}
            onClick={(e) => setTabMenuAnchor(e.currentTarget as HTMLElement)}
          >
            {activeTab === 'scripts' ? <DescriptionIcon fontSize="small" sx={{ color: 'primary.dark' }} />
              : activeTab === 'characters' ? <TheaterComedyIcon fontSize="small" sx={{ color: 'primary.dark' }} />
              : activeTab === 'storyteller' ? <MenuBookIcon fontSize="small" sx={{ color: 'primary.dark' }} />
              : activeTab === 'analytics' ? <QueryStatsIcon fontSize="small" sx={{ color: 'primary.dark' }} />
              : activeTab === 'printstudio' ? <PrintIcon fontSize="small" sx={{ color: 'primary.dark' }} />
              : <TuneIcon fontSize="small" sx={{ color: 'primary.dark' }} />}
            <Typography component="span"
              sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'primary.dark' }}>
              {activeTab === 'scripts' ? uiText.scriptSheet
                : activeTab === 'characters' ? uiText.allCharacters
                : activeTab === 'storyteller' ? stTabLabel
                : activeTab === 'printstudio' ? psTabLabel
                : activeTab === 'analytics' ? anTabLabel
                : stgTabLabel}
            </Typography>
            <ExpandMoreIcon fontSize="small" sx={{ color: 'primary.dark' }} />
          </Box>

          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>

            {/* ── Cloud sync status badge — always visible ── */}
            <CloudSyncBadge
              connected={cloudSync.connected}
              status={cloudSync.status}
              lastSynced={cloudSync.lastSynced}
              errorMessage={cloudSync.errorMessage}
              language={uiLanguage}
              onPress={() => setActiveTab('settings')}
            />

            <Tooltip title={uiLanguage === 'zh' ? '反馈建议' : 'Feedback'}>
              <IconButton
                size="small"
                href="https://forms.gle/3Bk1hkr4pLFhhSPx7"
                target="_blank"
                rel="noopener noreferrer"
              >
                <BugReportIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={showDescription ? (uiLanguage === 'zh' ? '隐藏说明' : 'Hide description') : (uiLanguage === 'zh' ? '显示说明' : 'Show description')}>
              <IconButton
                size="small"
                onClick={() => setShowDescription(v => !v)}
                sx={{ color: showDescription ? 'primary.main' : undefined }}
              >
                <InfoIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {showDescription && (
          <Box sx={{ px: 2, py: 1, bgcolor: 'rgba(133,63,34,0.06)', borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.primary' }}>{currentDescription}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>{disclaimerText}</Typography>
            <Box
              component="button"
              onClick={() => setShowChangelog(true)}
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: 'text.secondary', background: 'none', border: 'none', p: 0, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', '&:hover': { textDecorationColor: 'inherit', color: 'text.primary' }, flexShrink: 0 }}
            >
              <HistoryIcon sx={{ fontSize: '0.9rem' }} />
              <Typography variant="caption" sx={{ color: 'inherit' }}>
                {uiLanguage === 'zh' ? '更新日志' : 'Changelog'}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Mobile tab menu */}
        <Menu anchorEl={tabMenuAnchor} open={Boolean(tabMenuAnchor)} onClose={() => setTabMenuAnchor(null)}>
          {([
            ['scripts', uiText.scriptSheet, <DescriptionIcon fontSize="small" />],
            ['characters', uiText.allCharacters, <TheaterComedyIcon fontSize="small" />],
            ['storyteller', stTabLabel, <MenuBookIcon fontSize="small" />],
            ['analytics', anTabLabel, <QueryStatsIcon fontSize="small" />],
            ['printstudio', psTabLabel, <PrintIcon fontSize="small" />],
            ['settings', stgTabLabel, <TuneIcon fontSize="small" />],
          ] as [TabKey, string, React.ReactNode][]).map(([key, label, icon]) => (
            <MenuItem key={key} selected={activeTab === key} onClick={() => { setActiveTab(key); setTabMenuAnchor(null) }}>
              {icon}
              <ListItemText sx={{ ml: 1 }}>{label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
      </Paper>

      {activeTab === 'scripts' && (
        <ScriptsTab
          scripts={scripts}
          activeScript={activeScript}
          uiText={uiText}
          uiLanguage={uiLanguage}
          isEditMode={isEditMode}
          showWakeOrderPreview={showWakeOrderPreview}
          setShowWakeOrderPreview={setShowWakeOrderPreview}
          saveStatus={saveStatus}
          activeScriptCharacters={activeScriptCharacters}
          groupedScriptCharacters={groupedScriptCharacters}
          groupedEditorCharacters={groupedEditorCharacters}
          editorQuery={editorQuery}
          sheetDensityClass={sheetDensityClass}
          setIsEditMode={setIsEditMode}
          setEditorQuery={setEditorQuery}
          setActiveSlug={setActiveSlug}
          createNewScript={createNewScript}
          importScriptFile={importScriptFile}
          deleteScript={deleteScript}
          duplicateScript={duplicateScript}
          isBuiltIn={(slug) => initialSlugs.has(slug)}
          downloadScriptFile={downloadScriptFile}
          updateActiveScript={updateActiveScript}
          toggleCharacterInScript={toggleCharacterInScript}
          getScriptTitle={getScriptTitle}
          getSheetUiLabel={getSheetUiLabel}
          printOptions={printOptions}
          onLanguageChange={setUiLanguage}
          onPrintClick={() => setPrintPreviewOpen(true)}
          onCreateCustomFromId={(id) => { setPendingCustomCharId(id); setActiveTab('characters') }}
        />
      )}

      {printPreviewOpen && activeScript && (
        <PrintPreviewPage
          activeScript={activeScript}
          activeScriptCharacters={activeScriptCharacters}
          groupedScriptCharacters={groupedScriptCharacters}
          sheetDensityClass={sheetDensityClass}
          language={uiLanguage}
          onLanguageChange={setUiLanguage}
          getSheetUiLabel={getSheetUiLabel}
          printOptions={printOptions}
          onOptionsChange={setPrintOptions}
          onClose={() => setPrintPreviewOpen(false)}
          scripts={scripts}
          activeSlug={activeSlug}
          onScriptChange={setActiveSlug}
          getScriptTitle={getScriptTitle}
        />
      )}


      {activeTab === 'characters' && (
        <CharactersTab
          uiText={uiText}
          uiLanguage={uiLanguage}
          onLanguageChange={setUiLanguage}
          filteredCharacters={filteredCharacters}
          availableEditions={availableEditions}
          selectedTeams={selectedTeams}
          selectedEditions={selectedEditions}
          selectedCharacter={selectedCharacter}
          characterQuery={characterQuery}
          setCharacterQuery={setCharacterQuery}
          setSelectedCharacterId={setSelectedCharacterId}
          toggleTeam={(team) => setSelectedTeams((cur) => cur.includes(team) ? cur.filter((t) => t !== team) : [...cur, team])}
          toggleEdition={(edition) => setSelectedEditions((cur) => cur.includes(edition) ? cur.filter((e) => e !== edition) : [...cur, edition])}
          customChars={customChars}
          setCustomChars={setCustomChars}
          initialNewCharId={pendingCustomCharId}
          onInitialNewCharConsumed={() => setPendingCustomCharId(null)}
        />
      )}

      {activeTab === 'printstudio' && (
        <PrintStudioPage
          opts={tokenPrintOptions}
          onOptionsChange={setTokenPrintOptions}
          onClose={() => setActiveTab('scripts')}
          onOpenPrintPreview={() => { setActiveTab('scripts'); setPrintPreviewOpen(true) }}
          scriptCharacters={activeScriptCharacters}
          language={uiLanguage}
          onLanguageChange={setUiLanguage}
          scripts={scripts}
          activeSlug={activeSlug}
          onScriptChange={setActiveSlug}
          getScriptTitle={getScriptTitle}
        />
      )}

      {(activeTab === 'analytics' || mountedTabs.has('analytics')) && (
        <Box sx={{ display: activeTab === 'analytics' ? undefined : 'none' }}>
          <AnalyticsTab
            language={uiLanguage}
            onLanguageChange={setUiLanguage}
            sharedRecords={sharedAnalyticsRecords}
            shareDecodeError={shareDecodeError}
            onClearSharedRecords={clearSharedRecords}
          />
        </Box>
      )}

      {activeTab === 'settings' && (
        <SettingsTab language={uiLanguage} onLanguageChange={setUiLanguage} fontSettings={fontSettings} cloudSync={cloudSync} />
      )}

      {(activeTab === 'storyteller' || mountedTabs.has('storyteller')) && (
        <Box sx={{ display: activeTab === 'storyteller' ? undefined : 'none' }}>
          <StorytellerHelper
            activeScriptSlug={stActiveSlug}
            activeScriptTitle={getScriptTitle(scripts.find((s) => s.slug === stActiveSlug) ?? scripts[0])}
            language={uiLanguage}
            onLanguageChange={setUiLanguage}
            onSelectScript={setStActiveSlug}
            scriptOptions={scripts.map((s) => ({ slug: s.slug, title: s.title, titleZh: s.titleZh || s.title, version: s.version, characters: s.characters, pinnedRevisions: s.pinnedRevisions }))}
          />
        </Box>
      )}
      {/* ── Mobile bottom navigation ── */}
      {isMobileView && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100, borderTop: '1px solid', borderColor: 'divider' }} elevation={3}>
          <BottomNavigation
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ height: 56 }}
          >
            <BottomNavigationAction value="scripts"     label={uiLanguage === 'zh' ? '剧本' : 'Scripts'}     icon={<DescriptionIcon />}     sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem' } }} />
            <BottomNavigationAction value="characters"  label={uiLanguage === 'zh' ? '角色' : 'Chars'}        icon={<TheaterComedyIcon />}  sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem' } }} />
            <BottomNavigationAction value="storyteller" label={uiLanguage === 'zh' ? '主持' : 'ST'}           icon={<MenuBookIcon />}        sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem' } }} />
            <BottomNavigationAction value="analytics"   label={uiLanguage === 'zh' ? '统计' : 'Stats'}        icon={<QueryStatsIcon />}      sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem' } }} />
            <BottomNavigationAction value="printstudio" label={uiLanguage === 'zh' ? '打印' : 'Print'}        icon={<PrintIcon />}           sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem' } }} />
            <BottomNavigationAction value="settings"    label={uiLanguage === 'zh' ? '设置' : 'Settings'}     icon={<TuneIcon />}            sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem' } }} />
          </BottomNavigation>
        </Paper>
      )}

      {showChangelog && (
        <ChangelogPage onClose={() => setShowChangelog(false)} language={uiLanguage} />
      )}
    </Container>
  )
}
