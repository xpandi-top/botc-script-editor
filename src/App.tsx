import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Box,
  Container,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { PrintPreviewPage } from './components/PrintPreviewPage'
import { DEFAULT_PRINT_OPTIONS } from './components/PrintOptionsDialog'
import type { PrintOptions } from './components/PrintOptionsDialog'
import { PrintStudioPage } from './components/PrintStudio/PrintStudioPage'
import { DEFAULT_TOKEN_OPTIONS } from './components/PrintStudio/types'
import type { TokenPrintOptions } from './components/PrintStudio/types'
import { ScriptsTab } from './components/tabs/ScriptsTab'
import { CharactersTab } from './components/tabs/CharactersTab'
import { AnalyticsTab } from './components/tabs/AnalyticsTab'
import { StorytellerHelper } from './components/StorytellerHelper'
import {
  allCharacters,
  characterById,
  createScriptPayload,
  editionLabels,
  getAbilityText,
  getDisplayName,
  initialScripts,
  locales,
  parseScriptFromData,
  teamOrder,
  toTitleCase,
} from './catalog'
import { STORAGE_KEY, USER_SCRIPTS_KEY } from './components/StorytellerSub/constants'
import { storageSync } from './lib/storage'
import { exportGameFile } from './lib/exportGame'
import type {
  CharacterGroup,
  EditableScript,
  Language,
  ResolvedScriptCharacter,
  ResolvedScriptCharacterGroup,
  Team,
} from './types'

type TabKey = 'scripts' | 'characters' | 'storyteller' | 'printstudio' | 'analytics'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('scripts')
  const [uiLanguage, setUiLanguage] = useState<Language>('zh')
  const initialSlugs = useMemo(() => new Set(initialScripts.map((s) => s.slug)), [])
  const [scripts, setScripts] = useState<EditableScript[]>(() => {
    try {
      const stored = storageSync.getItem(USER_SCRIPTS_KEY)
      if (stored) {
        const user = JSON.parse(stored) as EditableScript[]
        return [...initialScripts, ...user]
      }
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
  }, [scripts, initialSlugs])

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
  const [headerVisible, setHeaderVisible] = useState(true)
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
    const customById = new Map(activeScript.customCharacters.map((c) => [c.id, c]))
    return activeScript.characters
      .map<ResolvedScriptCharacter | null>((id) => {
        const cat = characterById[id]
        const custom = customById.get(id)
        if (!cat && !custom) return null
        return {
          id,
          team: custom?.team ?? cat?.team ?? 'townsfolk',
          edition: custom?.edition ?? cat?.edition ?? activeScript.edition,
          current_revision: cat?.current_revision,
          revisions: cat?.revisions,
          jinxes: custom?.jinxes ?? cat?.jinxes,
          name: custom?.name,
          ability: custom?.ability,
          image: custom?.image,
        }
      })
      .filter((c): c is ResolvedScriptCharacter => c !== null)
  }, [activeScript])

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

  const availableEditions = useMemo(
    () => Array.from(new Set(allCharacters.map((c) => c.edition))).sort(
      (a, b) => (editionLabels[uiLanguage][a] ?? toTitleCase(a)).localeCompare(editionLabels[uiLanguage][b] ?? toTitleCase(b)),
    ),
    [uiLanguage],
  )

  const filteredCharacters = useMemo(() => {
    const query = characterQuery.trim().toLowerCase()
    return allCharacters.filter((c) => {
      const nameEn = getDisplayName(c.id, 'en').toLowerCase()
      const nameZh = getDisplayName(c.id, 'zh').toLowerCase()
      const abilityEn = getAbilityText(c.id, 'en').toLowerCase()
      const abilityZh = getAbilityText(c.id, 'zh').toLowerCase()
      const matchesQuery = !query || nameEn.includes(query) || nameZh.includes(query) || abilityEn.includes(query) || abilityZh.includes(query) || c.id.toLowerCase().includes(query)
      const matchesTeam = selectedTeams.length === 0 || selectedTeams.includes(c.team)
      const matchesEdition = selectedEditions.length === 0 || selectedEditions.includes(c.edition)
      return matchesQuery && matchesTeam && matchesEdition
    })
  }, [characterQuery, selectedEditions, selectedTeams])

  const filteredEditorCharacters = useMemo(() => {
    const query = editorQuery.trim().toLowerCase()
    return allCharacters.filter((c) =>
      !query ||
      getDisplayName(c.id, 'en').toLowerCase().includes(query) ||
      getDisplayName(c.id, 'zh').toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query) ||
      getAbilityText(c.id, 'en').toLowerCase().includes(query) ||
      getAbilityText(c.id, 'zh').toLowerCase().includes(query),
    )
  }, [editorQuery])

  const groupedEditorCharacters = useMemo<CharacterGroup[]>(
    () => teamOrder
      .map((team) => ({ team, characters: filteredEditorCharacters.filter((c) => c.team === team) }))
      .filter((g) => g.characters.length > 0),
    [filteredEditorCharacters],
  )

  const selectedCharacter = characterById[selectedCharacterId] ?? filteredCharacters[0] ?? allCharacters[0]

  useEffect(() => {
    if (selectedCharacter) setSelectedCharacterId(selectedCharacter.id)
  }, [selectedCharacter?.id])

  function updateActiveScript(updater: (s: EditableScript) => EditableScript, nextSlug?: string) {
    if (!activeScript) return
    setScripts((cur) => cur.map((s) => s.slug === activeScript.slug ? updater(s) : s))
    if (nextSlug && nextSlug !== activeScript.slug) setActiveSlug(nextSlug)
  }

  function importScriptFile(file: File) {
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
    const filename = `${activeScript.slug || 'script'}.json`
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

  const storytellerTabLabel = uiLanguage === 'zh' ? '主持助手' : 'Storyteller Helper'
  const printStudioTabLabel = uiLanguage === 'zh' ? '打印工坊' : 'Print Studio'
  const analyticsTabLabel = uiLanguage === 'zh' ? '数据统计' : 'Analytics'

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 0, sm: 3 }, px: { xs: 0, sm: 3 }, minHeight: '100vh' }}>
      <Paper elevation={1} sx={{
        mb: { xs: 0, sm: 2 },
        borderRadius: { xs: 0, sm: 2 },
        overflow: 'hidden',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        {/* ── Title + Tabs row ── */}
        <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.25, sm: 1.5 }, display: 'flex', alignItems: 'center', gap: 2 }}>

          {/* Brand — icon + title */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0,
              cursor: { xs: 'pointer', sm: 'default' } }}
            onClick={(e) => setTabMenuAnchor(e.currentTarget as HTMLElement)}
          >
            <Box component="img" src="appIcon.png" alt="BOTC Companion"
              sx={{ width: { xs: 28, sm: 34 }, height: { xs: 28, sm: 34 }, flexShrink: 0 }} />
            <Typography component="h1"
              sx={{ fontFamily: 'Georgia, "Times New Roman", serif', m: 0,
                fontWeight: 700, userSelect: 'none',
                fontSize: { xs: '1rem', sm: '1.2rem' },
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
              flex: '1 1 auto',
              display: { xs: 'none', sm: 'flex' },
              minHeight: 44,
              '& .MuiTab-root': {
                minHeight: 38,
                fontSize: '0.875rem',
                fontWeight: 500,
                px: 1.75,
                py: 0.5,
                mr: 0.5,
              },
            }}
          >
            <Tab label={uiText.scriptSheet} value="scripts" />
            <Tab label={uiText.allCharacters} value="characters" />
            <Tab label={storytellerTabLabel} value="storyteller" />
            <Tab label={analyticsTabLabel} value="analytics" />
            <Tab label={printStudioTabLabel} value="printstudio" />
          </Tabs>

          {/* Mobile: active tab name */}
          <Typography component="span"
            sx={{ display: { xs: 'flex', sm: 'none' }, flex: 1,
              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              color: 'primary.dark', userSelect: 'none' }}
            onClick={(e) => setTabMenuAnchor(e.currentTarget as HTMLElement)}>
            {activeTab === 'scripts' ? uiText.scriptSheet
              : activeTab === 'characters' ? uiText.allCharacters
              : activeTab === 'storyteller' ? storytellerTabLabel
              : activeTab === 'printstudio' ? printStudioTabLabel
              : analyticsTabLabel}
            {' ▾'}
          </Typography>

          <IconButton
            size="small"
            onClick={() => setHeaderVisible(v => !v)}
            title={headerVisible ? 'Hide header' : 'Show header'}
            sx={{ flexShrink: 0 }}
          >
            {headerVisible ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        {/* Mobile tab menu */}
        <Menu anchorEl={tabMenuAnchor} open={Boolean(tabMenuAnchor)} onClose={() => setTabMenuAnchor(null)}>
          {([
            ['scripts', uiText.scriptSheet],
            ['characters', uiText.allCharacters],
            ['storyteller', storytellerTabLabel],
            ['analytics', analyticsTabLabel],
            ['printstudio', printStudioTabLabel],
          ] as [TabKey, string][]).map(([key, label]) => (
            <MenuItem key={key} selected={activeTab === key} onClick={() => { setActiveTab(key); setTabMenuAnchor(null) }}>
              <ListItemText>{label}</ListItemText>
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
          availableEditions={availableEditions}
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

      {activeTab === 'analytics' && (
        <AnalyticsTab language={uiLanguage} onLanguageChange={setUiLanguage} />
      )}

      {activeTab === 'storyteller' && (
        <StorytellerHelper
          activeScriptSlug={stActiveSlug}
          activeScriptTitle={getScriptTitle(scripts.find((s) => s.slug === stActiveSlug) ?? scripts[0])}
          language={uiLanguage}
          onLanguageChange={setUiLanguage}
          onSelectScript={setStActiveSlug}
          scriptOptions={scripts.map((s) => ({ slug: s.slug, title: getScriptTitle(s), characters: s.characters }))}
        />
      )}
    </Container>
  )
}
