import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Box,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  Typography,
  Button,
} from '@mui/material'
import PrintIcon from '@mui/icons-material/Print'
import { ScriptsTab } from './components/tabs/ScriptsTab'
import { SettingsTab } from './components/tabs/SettingsTab'
import { CharactersTab } from './components/tabs/CharactersTab'
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
  sortCharacterIds,
  teamOrder,
  toTitleCase,
} from './catalog'
import { STORAGE_KEY } from './components/StorytellerSub/constants'
import type {
  CharacterGroup,
  EditableScript,
  Language,
  ResolvedScriptCharacter,
  ResolvedScriptCharacterGroup,
  Team,
} from './types'

type TabKey = 'scripts' | 'settings' | 'characters' | 'storyteller'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('scripts')
  const [uiLanguage, setUiLanguage] = useState<Language>('zh')
  const [scripts, setScripts] = useState<EditableScript[]>(initialScripts)
  const [activeSlug, setActiveSlug] = useState<string>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const p = JSON.parse(stored)
        if (p.activeScriptSlug && initialScripts.some(s => s.slug === p.activeScriptSlug)) {
          return p.activeScriptSlug
        }
      }
    } catch {}
    return initialScripts[0]?.slug ?? ''
  })
  const [characterQuery, setCharacterQuery] = useState('')
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([])
  const [selectedEditions, setSelectedEditions] = useState<string[]>([])
  const [editorQuery, setEditorQuery] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [pdfFontSize, setPdfFontSize] = useState(11)
  const [showWakeOrderPreview, setShowWakeOrderPreview] = useState(true)
  const [saveStatus, setSaveStatus] = useState('')
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
    return sortCharacterIds(activeScript.characters)
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

  function downloadScriptFile() {
    if (!activeScript) return
    const payload = JSON.stringify(createScriptPayload(activeScript), null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${activeScript.slug || 'script'}.json`
    link.click()
    URL.revokeObjectURL(url)
    setSaveStatus(`Downloaded ${link.download}`)
  }

  function toggleCharacterInScript(characterId: string) {
    updateActiveScript((s) => ({
      ...s,
      characters: s.characters.includes(characterId)
        ? s.characters.filter((id) => id !== characterId)
        : sortCharacterIds([...s.characters, characterId]),
    }))
  }

  const storytellerTabLabel = uiLanguage === 'zh' ? '主持助手' : 'Storyteller Helper'

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 0, sm: 3 }, px: { xs: 0, sm: 3 }, minHeight: '100vh' }}>
      <Paper elevation={0} sx={{ p: { xs: 1, sm: 3 }, mb: { xs: 0, sm: 2 }, borderRadius: { xs: 0, sm: 3 }, background: 'rgba(255,251,245,0.9)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body1" component="h1" sx={{ fontFamily: 'Georgia, "Times New Roman", serif', m: 0, fontWeight: 700, display: { xs: 'none', sm: 'block' } }}>
            {uiText.appTitle}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <InputLabel>{uiText.language}</InputLabel>
              <Select value={uiLanguage} label={uiText.language} onChange={(e) => setUiLanguage(e.target.value as Language)}>
                <MenuItem value="en">{uiText.english}</MenuItem>
                <MenuItem value="zh">{uiText.chinese}</MenuItem>
              </Select>
            </FormControl>
            {activeTab !== 'characters' && activeTab !== 'storyteller' && activeScript && (
              <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ borderRadius: 999, display: { xs: 'none', sm: 'flex' } }}>
                {uiText.print}
              </Button>
            )}
          </Box>
        </Box>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: { xs: 36, sm: 48 },
            '& .MuiTab-root': { textTransform: 'none', borderRadius: 999, border: '1px solid', borderColor: 'divider', mr: 0.5, minHeight: { xs: 32, sm: 48 }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 0.5, sm: 1 }, px: { xs: 1, sm: 1.5 } },
            '& .Mui-selected': { backgroundColor: 'rgba(133, 63, 34, 0.1)', borderColor: 'primary.main' },
          }}
        >
          <Tab label={uiText.scriptSheet} value="scripts" />
          <Tab label={uiText.settings} value="settings" />
          <Tab label={uiText.allCharacters} value="characters" />
          <Tab label={storytellerTabLabel} value="storyteller" />
        </Tabs>
      </Paper>

      {activeTab === 'scripts' && (
        <ScriptsTab
          scripts={scripts}
          activeScript={activeScript}
          uiText={uiText}
          uiLanguage={uiLanguage}
          isEditMode={isEditMode}
          showWakeOrderPreview={showWakeOrderPreview}
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
          downloadScriptFile={downloadScriptFile}
          updateActiveScript={updateActiveScript}
          toggleCharacterInScript={toggleCharacterInScript}
          getScriptTitle={getScriptTitle}
          getSheetUiLabel={getSheetUiLabel}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          uiText={uiText}
          uiLanguage={uiLanguage}
          activeScript={activeScript}
          pdfFontSize={pdfFontSize}
          showWakeOrderPreview={showWakeOrderPreview}
          setPdfFontSize={setPdfFontSize}
          setShowWakeOrderPreview={setShowWakeOrderPreview}
          getScriptTitle={getScriptTitle}
        />
      )}

      {activeTab === 'characters' && (
        <CharactersTab
          uiText={uiText}
          uiLanguage={uiLanguage}
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

      {activeTab === 'storyteller' && (
        <StorytellerHelper
          activeScriptSlug={activeScript?.slug}
          activeScriptTitle={activeScript ? getScriptTitle(activeScript) : undefined}
          language={uiLanguage}
          onSelectScript={setActiveSlug}
          scriptOptions={scripts.map((s) => ({ slug: s.slug, title: getScriptTitle(s), characters: s.characters }))}
        />
      )}
    </Container>
  )
}
