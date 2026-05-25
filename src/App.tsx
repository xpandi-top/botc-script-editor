import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
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
import SchoolIcon from '@mui/icons-material/School'
import { ChangelogPage } from './components/ChangelogPage'
import { TutorialOverlay } from './components/Tutorial/TutorialOverlay'
import { AiChatDialog, type AiChatCallbacks } from './components/AiChatDialog'
import type { AiContext } from './lib/ai'
import { buildScriptContext, buildGeneralContext, buildAnalysisContext } from './lib/ai'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import Fab from '@mui/material/Fab'
import { TUTORIAL_KEY } from './components/Tutorial/tutorialSteps'
import { PrintPreviewPage } from './components/PrintPreviewPage'
import { DEFAULT_PRINT_OPTIONS } from './components/PrintOptionsDialog'
import type { PrintOptions } from './components/PrintOptionsDialog'
import { DEFAULT_TOKEN_OPTIONS } from './components/PrintStudio/types'
import type { TokenPrintOptions } from './components/PrintStudio/types'
import { ScriptsTab } from './components/tabs/ScriptsTab'
import { SettingsTab } from './components/tabs/SettingsTab'
const PrintStudioPage  = lazy(() => import('./components/PrintStudio/PrintStudioPage').then(m => ({ default: m.PrintStudioPage })))
const CharactersTab    = lazy(() => import('./components/tabs/CharactersTab').then(m => ({ default: m.CharactersTab })))
const AnalyticsTab     = lazy(() => import('./components/tabs/AnalyticsTab').then(m => ({ default: m.AnalyticsTab })))
const StorytellerHelper = lazy(() => import('./components/StorytellerHelper').then(m => ({ default: m.StorytellerHelper })))
import { DealGuestPage } from './components/DealGuestPage'
import { DealHostPage } from './components/DealHostPage'
import { HOST_TOKEN_KEY } from './lib/firebaseDeal'
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
import type { GameRecord } from './components/StorytellerSub/types'
import { BOTC_SCRIPT_FOLDERS_KEY } from './components/tabs/ScriptsTab.constants'
import { useCloudSync } from './hooks/useCloudSync'
import { getClientId } from './lib/googleAuth'
import type { SyncStatus } from './hooks/useCloudSync'
import { useShareParam, updateUrlParams } from './hooks/useShareParam'
import type { TabKey } from './hooks/useShareParam'


type ScriptMeta = { tags?: string[]; notes?: string; pinnedRevisions?: Record<string, string>; folderId?: string }
import { storageSync } from './lib/storage'
import { exportGameFile } from './lib/exportGame'
import type {
  CharacterGroup,
  CustomCharacter,
  EditableScript,
  Language,
  ResolvedScriptCharacter,
  ResolvedScriptCharacterGroup,
  ScriptFolder,
  Team,
} from './types'
import { useThemeMode } from './context/ThemeMode'
import { I18nProvider } from './context/I18nContext'
import { makeT, makeTpl } from './lib/t'

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
  const t = makeT(language)
  const tpl = makeTpl(language)
  const isBusy = status === 'syncing' || status === 'pulling' || status === 'pushing'
  const isError = status === 'error'
  const isConfigured = !!getClientId()

  let icon: React.ReactNode
  let dotColor: string
  let tooltipLines: string[]

  if (!isConfigured) {
    icon = <CloudOffIcon fontSize="small" sx={{ color: 'text.disabled' }} />
    dotColor = 'transparent'
    tooltipLines = [t('cloud_sync_not_configured'), t('cloud_sync_enter_client_id')]
  } else if (!connected) {
    icon = <CloudOffIcon fontSize="small" sx={{ color: 'text.secondary' }} />
    dotColor = 'grey.400'
    tooltipLines = [t('not_connected_google_drive'), t('click_to_go_to_settings')]
  } else if (isError) {
    icon = <SyncProblemIcon fontSize="small" sx={{ color: 'error.main' }} />
    dotColor = 'error.main'
    tooltipLines = [
      t('sync_error'),
      errorMessage ?? t('unknown_error'),
    ]
  } else if (isBusy) {
    icon = <CloudSyncIcon fontSize="small" sx={{ color: 'primary.main' }} />
    dotColor = 'primary.main'
    tooltipLines = [
      status === 'pulling' ? t('pulling_from_drive')
        : status === 'pushing' ? t('pushing_to_drive')
        : t('syncing'),
    ]
  } else {
    // connected + idle
    icon = <CloudDoneIcon fontSize="small" sx={{ color: 'success.main' }} />
    dotColor = 'success.main'
    tooltipLines = [
      t('connected_google_drive'),
      lastSynced ? tpl('last_synced_time', lastSynced.toLocaleTimeString()) : t('not_yet_synced'),
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
  const {
    activeTab, setActiveTab,
    sharedAnalyticsRecords, shareDecodeError, clearSharedRecords,
    dealSessionId, dealHostToken,
    initialScriptSlug, sharedScript, sharedScriptError, clearSharedScript,
    scriptLinkPending,
  } = useShareParam()

  const [showChangelog, setShowChangelog] = useState(false)
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem(TUTORIAL_KEY))

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
          ...(m.folderId !== undefined ? { folderId: m.folderId } : {}),
        }
      }
      return [...initialScripts.map(applyMeta), ...user.map(applyMeta)]
    } catch {}
    return initialScripts
  })
  const [activeSlug, setActiveSlug] = useState<string>(() => {
    // ?s=<slug> takes priority — jump straight to that built-in script
    if (initialScriptSlug && initialScripts.some((s) => s.slug === initialScriptSlug)) {
      return initialScriptSlug
    }
    return initialScripts[0]?.slug ?? ''
  })

  // ── URL sync: keep ?t= and ?s= in sync with active tab/script ────────────────
  useEffect(() => {
    if (dealSessionId) return       // deal page owns the URL
    if (scriptLinkPending) return   // ?ss= still resolving — don't overwrite it
    const isBuiltIn = initialSlugs.has(activeSlug)
    updateUrlParams({
      t: activeTab,
      s: (activeTab === 'scripts' && isBuiltIn) ? activeSlug : null,
    })
  }, [activeTab, activeSlug, initialSlugs, dealSessionId, scriptLinkPending])

  // ── Handle shared custom script from ?ss= short link ─────────────────────────
  useEffect(() => {
    if (!sharedScript) return
    // Import as if user uploaded the file
    let slug = sharedScript.slug
    let counter = 2
    while (scripts.some((s) => s.slug === slug)) { slug = `${sharedScript.slug}-${counter}`; counter++ }
    const imported = { ...sharedScript, slug }
    setScripts((cur) => [...cur, imported])
    setActiveSlug(imported.slug)
    clearSharedScript()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedScript])

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
      if (s.folderId) m.folderId = s.folderId
      if (Object.keys(m).length) meta[s.slug] = m
    }
    try { localStorage.setItem(SCRIPT_META_KEY, JSON.stringify(meta)) } catch {}
    scheduleSync()
  }, [scripts, initialSlugs, scheduleSync])

  // ── Script folders ────────────────────────────────────────────────────────
  const [scriptFolders, setScriptFolders] = useState<ScriptFolder[]>(() => {
    try { return JSON.parse(localStorage.getItem(BOTC_SCRIPT_FOLDERS_KEY) ?? '[]') as ScriptFolder[] } catch { return [] }
  })
  useEffect(() => {
    try { localStorage.setItem(BOTC_SCRIPT_FOLDERS_KEY, JSON.stringify(scriptFolders)) } catch {}
  }, [scriptFolders])

  function createFolder(name: string, section: 'community' | 'diy' = 'diy'): ScriptFolder {
    const id = `folder-${Date.now()}`
    const folder: ScriptFolder = { id, name, order: scriptFolders.length, section }
    setScriptFolders((cur) => [...cur, folder])
    return folder
  }
  function renameFolder(id: string, name: string) {
    setScriptFolders((cur) => cur.map((f) => f.id === id ? { ...f, name } : f))
  }
  function deleteFolder(id: string) {
    // un-assign scripts that were in this folder
    setScripts((cur) => cur.map((s) => s.folderId === id ? { ...s, folderId: undefined } : s))
    setScriptFolders((cur) => cur.filter((f) => f.id !== id))
  }
  function toggleFolderCollapsed(id: string) {
    setScriptFolders((cur) => cur.map((f) => f.id === id ? { ...f, collapsed: !f.collapsed } : f))
  }
  function moveScriptToFolder(slug: string, folderId: string | undefined) {
    setScripts((cur) => cur.map((s) => s.slug === slug ? { ...s, folderId } : s))
  }

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

  // Track game records for AI context (Analytics tab) — read from storage, stay in sync
  const readRecords = (): GameRecord[] => {
    try {
      const raw = storageSync.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw).gameRecords ?? []) : []
    } catch { return [] }
  }
  const [analyticsRecords, setAnalyticsRecords] = useState<GameRecord[]>(readRecords)

  // Sync when game records change (written directly by Analytics/Storyteller, not via React state)
  useEffect(() => {
    const handler = () => { scheduleSync(); setAnalyticsRecords(readRecords()) }
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
  const [saveStatus, setSaveStatus] = useState(sharedScriptError ?? '')
  const [showDescription, setShowDescription] = useState(false)
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [aiContext, setAiContext] = useState<AiContext | undefined>(undefined)
  const [stAiContext, setStAiContext] = useState<AiContext | undefined>(undefined)
  const aiFillRef = useRef<((field: string, value: unknown) => void) | null>(null)
  const aiCallbacks: AiChatCallbacks = {
    onFill:  (field, value) => aiFillRef.current?.(field, value),
    onUndo:  (field, value) => aiFillRef.current?.(field, value),
  }
  const [tabMenuAnchor, setTabMenuAnchor] = useState<null | HTMLElement>(null)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(allCharacters[0]?.id ?? '')

  const activeScript = useMemo(
    () => scripts.find((s) => s.slug === activeSlug) ?? scripts[0],
    [activeSlug, scripts],
  )

  const scriptAiContext = useMemo(() => {
    if (!activeScript) return buildGeneralContext(uiLanguage)
    return buildScriptContext({ script: activeScript, language: uiLanguage })
  }, [activeScript, uiLanguage])

  const effectiveAiContext = useMemo((): AiContext => {
    switch (activeTab) {
      case 'scripts':     return scriptAiContext
      case 'storyteller': return stAiContext ?? buildGeneralContext(uiLanguage)
      case 'characters':  return aiContext ?? buildGeneralContext(uiLanguage)
      case 'analytics':   return buildAnalysisContext({ language: uiLanguage, records: analyticsRecords })
      default:            return buildGeneralContext(uiLanguage)
    }
  }, [activeTab, scriptAiContext, stAiContext, aiContext, uiLanguage, analyticsRecords])

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
          name: scriptCustom?.name ?? (globalCustom ? getDisplayName(id, 'en') : undefined),
          nameZh: scriptCustom?.name_zh ?? (globalCustom ? getDisplayName(id, 'zh') : undefined),
          ability: scriptCustom?.ability ?? (globalCustom
            ? getAbilityText(id, 'en')
            : cat ? getAbilityTextForScript(id, 'en', activeScript.pinnedRevisions) : undefined),
          abilityZh: scriptCustom?.ability_zh ?? (globalCustom
            ? getAbilityText(id, 'zh')
            : cat ? getAbilityTextForScript(id, 'zh', activeScript.pinnedRevisions) : undefined),
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

  // Keep registry in sync before dependent useMemo calls read from it.
  // useEffect is too late (post-render). useRef guard: only calls when customChars
  // identity changes — safe in concurrent mode (idempotent, no DOM side-effects).
  const _prevCustomCharsRef = useRef(customChars)
  if (_prevCustomCharsRef.current !== customChars) {
    _prevCustomCharsRef.current = customChars
    registerCustomCharacters(customChars)
  }

  const availableEditions = useMemo(
    () => Array.from(new Set(getEffectiveAllCharacters().map((c) => c.edition))).sort(
      (a, b) => (editionLabels[uiLanguage][a] ?? toTitleCase(a)).localeCompare(editionLabels[uiLanguage][b] ?? toTitleCase(b)),
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uiLanguage, customChars],
  )

  const t = makeT(uiLanguage)
  const tabDescriptions: Record<TabKey, string> = {
    scripts: t('tab_desc_scripts'),
    characters: t('tab_desc_characters'),
    storyteller: t('tab_desc_storyteller'),
    analytics: t('tab_desc_analytics'),
    printstudio: t('tab_desc_printstudio'),
    settings: t('tab_desc_settings'),
  }

  const disclaimerText = t('disclaimer')

  const currentDescription = tabDescriptions[activeTab] ?? ''

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

  // ── Deal page full-screen takeover ────────────────────────────────────────────
  // Must be AFTER all hooks (React rules). When ?deal= is present, render deal
  // UI and skip the normal app shell entirely.
  if (dealSessionId) {
    // Resolve host token: ?host= param takes priority, then localStorage
    const resolvedHostToken = dealHostToken ?? (() => {
      try { return localStorage.getItem(HOST_TOKEN_KEY(dealSessionId)) } catch { return null }
    })()

    if (resolvedHostToken) {
      return (
        <DealHostPage
          sessionId={dealSessionId}
          hostToken={resolvedHostToken}
          language={uiLanguage}
          onClose={() => {
            // Strip ?deal= + ?host= and reload as normal app
            const clean = new URL(window.location.href)
            clean.searchParams.delete('deal')
            clean.searchParams.delete('host')
            window.history.replaceState({}, '', clean.toString())
            window.location.reload()
          }}
        />
      )
    }

    return (
      <DealGuestPage
        sessionId={dealSessionId}
        language={uiLanguage}
      />
    )
  }

  // On every tab switch: scroll to top first, then apply overflow lock for ST mobile.
  // Both in one effect so scroll runs before lock — prevents Safari from trapping
  // the page at a non-zero scroll position under overflow:hidden.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const needsLock = activeTab === 'storyteller' && isMobileView
    document.body.style.overflow = needsLock ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [activeTab, isMobileView])

  const stTabLabel = t('storyteller_helper')
  const psTabLabel = t('print_studio')
  const anTabLabel = t('analytics_title')
  const stgTabLabel = t('settings')

  return (
    <I18nProvider language={uiLanguage}>
    <Container maxWidth="xl" sx={{ pt: 0, pb: { xs: '56px', sm: 3 }, px: { xs: 0, sm: 3 }, minHeight: '100vh' }}>
      {/* Hide header on mobile storyteller — MobileTopBar is the header there.
          Height: 100dvh in StorytellerHelper needs the viewport to start at y=0. */}
      <Paper elevation={2} sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        mb: { xs: 0, sm: 2 },
        borderRadius: 0,
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
            <Tab icon={<DescriptionIcon fontSize="small" />} value="scripts" aria-label={uiText.scriptSheet} title={uiText.scriptSheet} data-tutorial="tab-scripts" />
            <Tab icon={<TheaterComedyIcon fontSize="small" />} value="characters" aria-label={uiText.allCharacters} title={uiText.allCharacters} data-tutorial="tab-characters" />
            <Tab icon={<MenuBookIcon fontSize="small" />} value="storyteller" aria-label={stTabLabel} title={stTabLabel} data-tutorial="tab-storyteller" />
            <Tab icon={<QueryStatsIcon fontSize="small" />} value="analytics" aria-label={anTabLabel} title={anTabLabel} data-tutorial="tab-analytics" />
            <Tab icon={<PrintIcon fontSize="small" />} value="printstudio" aria-label={psTabLabel} title={psTabLabel} data-tutorial="tab-printstudio" />
            <Tab icon={<TuneIcon fontSize="small" />} value="settings" aria-label={stgTabLabel} title={stgTabLabel} data-tutorial="tab-settings" />
          </Tabs>

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

            <Tooltip title={t('feedback')}>
              <IconButton
                size="small"
                href="https://forms.gle/3Bk1hkr4pLFhhSPx7"
                target="_blank"
                rel="noopener noreferrer"
              >
                <BugReportIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={showDescription ? t('hide_description') : t('show_description')}>
              <IconButton
                size="small"
                onClick={() => setShowDescription(v => !v)}
                sx={{ color: showDescription ? 'primary.main' : undefined }}
                data-tutorial="info-btn"
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
                {t('changelog')}
              </Typography>
            </Box>
            <Box
              component="button"
              onClick={() => { localStorage.removeItem(TUTORIAL_KEY); setShowTutorial(true) }}
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: 'text.secondary', background: 'none', border: 'none', p: 0, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', '&:hover': { textDecorationColor: 'inherit', color: 'text.primary' }, flexShrink: 0 }}
            >
              <SchoolIcon sx={{ fontSize: '0.9rem' }} />
              <Typography variant="caption" sx={{ color: 'inherit' }}>
                {t('tutorial')}
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
          scriptFolders={scriptFolders}
          createFolder={createFolder}
          renameFolder={renameFolder}
          deleteFolder={deleteFolder}
          toggleFolderCollapsed={toggleFolderCollapsed}
          moveScriptToFolder={moveScriptToFolder}
          downloadScriptFile={downloadScriptFile}
          updateActiveScript={updateActiveScript}
          toggleCharacterInScript={toggleCharacterInScript}
          getScriptTitle={getScriptTitle}
          getSheetUiLabel={getSheetUiLabel}
          printOptions={printOptions}
          onLanguageChange={setUiLanguage}
          onPrintClick={() => setPrintPreviewOpen(true)}
          onCreateCustomFromId={(id) => { setPendingCustomCharId(id); setActiveTab('characters') }}
          isCurrentBuiltIn={!!(activeScript && initialSlugs.has(activeScript.slug))}
          customChars={customChars}
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
        <Suspense fallback={<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}>
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
            onAiContextChange={setAiContext}
            aiFillRef={aiFillRef}
          />
        </Suspense>
      )}

      {activeTab === 'printstudio' && (
        <Suspense fallback={<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}>
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
        </Suspense>
      )}

      {(activeTab === 'analytics' || mountedTabs.has('analytics')) && (
        <Box sx={{ display: activeTab === 'analytics' ? undefined : 'none' }}>
          <Suspense fallback={<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}>
            <AnalyticsTab
              language={uiLanguage}
              onLanguageChange={setUiLanguage}
              sharedRecords={sharedAnalyticsRecords}
              shareDecodeError={shareDecodeError}
              onClearSharedRecords={clearSharedRecords}
            />
          </Suspense>
        </Box>
      )}

      {activeTab === 'settings' && (
        <SettingsTab language={uiLanguage} onLanguageChange={setUiLanguage} fontSettings={fontSettings} cloudSync={cloudSync} />
      )}

      {(activeTab === 'storyteller' || mountedTabs.has('storyteller')) && (
        <Box sx={{ display: activeTab === 'storyteller' ? undefined : 'none' }}>
          <Suspense fallback={<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}>
            <StorytellerHelper
              activeScriptSlug={stActiveSlug}
              activeScriptTitle={getScriptTitle(scripts.find((s) => s.slug === stActiveSlug) ?? scripts[0])}
              language={uiLanguage}
              onLanguageChange={setUiLanguage}
              onSelectScript={setStActiveSlug}
              scriptOptions={scripts.map((s) => ({ slug: s.slug, title: s.title, titleZh: s.titleZh || s.title, version: s.version, characters: s.characters, pinnedRevisions: s.pinnedRevisions }))}
              onSwitchTab={(tab) => setActiveTab(tab as Parameters<typeof setActiveTab>[0])}
              onAiContextChange={setStAiContext}
            />
          </Suspense>
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
            <BottomNavigationAction value="scripts"     label={t('script_sheet')}     icon={<DescriptionIcon />}     sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem' } }} />
            <BottomNavigationAction value="characters"  label={t('chars')}             icon={<TheaterComedyIcon />}  sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem' } }} />
            <BottomNavigationAction value="storyteller" label={t('tab_st_short')}      icon={<MenuBookIcon />}        sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem' } }} />
            <BottomNavigationAction value="analytics"   label={t('tab_stats_short')}   icon={<QueryStatsIcon />}      sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem' } }} />
            <BottomNavigationAction value="printstudio" label={t('tab_print_short')}   icon={<PrintIcon />}           sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem' } }} />
            <BottomNavigationAction value="settings"    label={t('settings')}          icon={<TuneIcon />}            sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem' } }} />
          </BottomNavigation>
        </Paper>
      )}

      {showTutorial && (
        <TutorialOverlay
          language={uiLanguage}
          onClose={() => setShowTutorial(false)}
          onTabChange={(tab) => setActiveTab(tab as Parameters<typeof setActiveTab>[0])}
        />
      )}

      {showChangelog && (
        <ChangelogPage onClose={() => setShowChangelog(false)} language={uiLanguage} />
      )}

      {/* AI chat FAB — always shown (runtime key config), hidden on storyteller mobile */}
      {!(activeTab === 'storyteller' && isMobileView) && (
        <Tooltip title={t('ai_assistant_experimental')} placement="left">
          <Box sx={{ position: 'fixed', bottom: { xs: 68, sm: 24 }, right: { xs: 12, sm: 24 }, zIndex: 1200 }}>
            <Fab
              size="small"
              onClick={() => setAiChatOpen((v) => !v)}
              sx={{
                bgcolor: aiChatOpen ? 'primary.dark' : 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
                boxShadow: aiChatOpen ? 'none' : undefined,
              }}
            >
              <AutoAwesomeIcon fontSize="small" />
            </Fab>
            {/* Experimental badge */}
            <Box sx={{
              position: 'absolute', top: -6, right: -6,
              bgcolor: 'warning.main', color: 'warning.contrastText',
              fontSize: '0.55rem', fontWeight: 700, px: 0.5, py: 0.1,
              borderRadius: 0.75, lineHeight: 1.4, pointerEvents: 'none',
              letterSpacing: '0.02em',
            }}>
              {t('exp_short')}
            </Box>
          </Box>
        </Tooltip>
      )}

      <AiChatDialog
        open={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        language={uiLanguage}
        context={effectiveAiContext}
        callbacks={aiCallbacks}
      />
    </Container>
    </I18nProvider>
  )
}
