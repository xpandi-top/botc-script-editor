import {
  Fragment,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  FormControlLabel,
  Checkbox,
  IconButton,
} from '@mui/material'
import PrintIcon from '@mui/icons-material/Print'
import AddIcon from '@mui/icons-material/Add'
import { CharacterRevisionPanel } from './components/CharacterRevisionPanel'
import { FilterCheckbox } from './components/FilterCheckbox'
import { ScriptList } from './components/ScriptList'
import { SheetArticle } from './components/SheetArticle'
import { StorytellerHelper } from './components/StorytellerHelper'
import {
  allCharacters,
  characterById,
  createScriptPayload,
  editionLabels,
  getAbilityText,
  getCurrentRevision,
  getDisplayName,
  getIconForCharacter,
  initialScripts,
  locales,
  sortCharacterIds,
  teamLabels,
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

  const getInitialScriptSlug = () => {
    if (typeof window === 'undefined') return initialScripts[0]?.slug ?? ''
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const p = JSON.parse(stored)
        if (p.activeScriptSlug && scripts.some(s => s.slug === p.activeScriptSlug)) {
          return p.activeScriptSlug
        }
      }
    } catch {}
    return initialScripts[0]?.slug ?? ''
  }
  const [activeSlug, setActiveSlug] = useState<string>(getInitialScriptSlug)
  const [characterQuery, setCharacterQuery] = useState('')
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([])
  const [selectedEditions, setSelectedEditions] = useState<string[]>([])
  const [editorQuery, setEditorQuery] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [pdfFontSize, setPdfFontSize] = useState(11)
  const [showWakeOrderPreview, setShowWakeOrderPreview] = useState(true)
  const [saveStatus, setSaveStatus] = useState('')
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(
    allCharacters[0]?.id ?? '',
  )

  const activeScript = useMemo(
    () => scripts.find((script) => script.slug === activeSlug) ?? scripts[0],
    [activeSlug, scripts],
  )

  const uiText = useMemo(() => {
    const localeUi = locales[uiLanguage].ui
    if (!localeUi) {
      throw new Error(`Missing ui locale section: ${uiLanguage}.ui`)
    }
    const ui = localeUi

    function required(key: string) {
      const value = ui[key]
      if (!value) {
        throw new Error(`Missing ui locale string: ${uiLanguage}.${key}`)
      }

      return value
    }

    return {
      appTitle: required('app_title'),
      appLead: required('app_lead'),
      print: required('print'),
      scriptSheet: required('script_sheet'),
      settings: required('settings'),
      allCharacters: required('all_characters'),
      newScript: required('new_script'),
      editScript: required('edit_script'),
      doneEditing: required('done_editing'),
      downloadJson: required('download_json'),
      noScripts: required('no_scripts'),
      pdfSettings: required('pdf_settings'),
      currentScript: required('current_script'),
      fontSize: required('font_size'),
      fontSizePt: required('font_size_pt'),
      reset: required('reset'),
      preview: required('preview'),
      wakeOrderToggle: required('wake_order_toggle'),
      wakeOrderNote: required('wake_order_note'),
      resultsSuffix: required('results_suffix'),
      searchCharacters: required('search_characters'),
      title: required('title'),
      chineseTitle: required('chinese_title'),
      author: required('author'),
      bootleggerRules: required('bootlegger_rules'),
      bootleggerRulesHelp: required('bootlegger_rules_help'),
      bootleggerRulesZh: required('bootlegger_rules_zh'),
      bootleggerRulesZhHelp: required('bootlegger_rules_zh_help'),
      bootleggerRulePlaceholder: required('bootlegger_rule_placeholder'),
      bootleggerRuleZhPlaceholder: required('bootlegger_rule_zh_placeholder'),
      scriptJinxes: required('script_jinxes'),
      scriptJinxesHelp: required('script_jinxes_help'),
      jinxPairId: required('jinx_pair_id'),
      jinxPairPlaceholder: required('jinx_pair_placeholder'),
      jinxStatus: required('jinx_status'),
      jinxStatusActive: required('jinx_status_active'),
      jinxStatusInactive: required('jinx_status_inactive'),
      jinxReasonEnPlaceholder: required('jinx_reason_en_placeholder'),
      jinxReasonZhPlaceholder: required('jinx_reason_zh_placeholder'),
      addJinx: required('add_jinx'),
      addRule: required('add_rule'),
      remove: required('remove'),
      custom: required('custom'),
      editionLabel: required('edition_label'),
      characterSearch: required('character_search'),
      filterCharacters: required('filter_characters'),
      export: required('export'),
      language: required('language'),
      english: required('english'),
      chinese: required('chinese'),
      characterVersions: required('character_versions'),
      currentRevision: required('current_revision'),
      revisionHistory: required('revision_history'),
      revisionNote: required('revision_note'),
      englishText: required('english_text'),
      chineseText: required('chinese_text'),
      current: required('current'),
      noCharacterSelected: required('no_character_selected'),
      availableCharacters: required('available_characters'),
      selectedCharacters: required('selected_characters'),
      selectedCount: required('selected_count'),
      noCharacters: required('no_characters'),
    }
  }, [uiLanguage])

  const getScriptTitle = (script: EditableScript) =>
    uiLanguage === 'zh' ? script.titleZh || script.title : script.title

  const storytellerTabLabel = uiLanguage === 'zh' ? '主持助手' : 'Storyteller Helper'

  function getSheetUiLabel(language: Language, key: string) {
    const value = locales[language].ui?.[key]
    if (!value) {
      throw new Error(`Missing ui locale string: ${language}.${key}`)
    }

    return value
  }

  const activeScriptCharacters = useMemo<ResolvedScriptCharacter[]>(() => {
    if (!activeScript) {
      return []
    }

    const customCharactersById = new Map(
      activeScript.customCharacters.map((character) => [character.id, character]),
    )

    const resolvedCharacters = sortCharacterIds(activeScript.characters).map<
      ResolvedScriptCharacter | null
    >((id) => {
        const catalogCharacter = characterById[id]
        const customCharacter = customCharactersById.get(id)

        if (!catalogCharacter && !customCharacter) {
          return null
        }

        return {
          id,
          team: customCharacter?.team ?? catalogCharacter?.team ?? 'townsfolk',
          edition: customCharacter?.edition ?? catalogCharacter?.edition ?? activeScript.edition,
          current_revision: catalogCharacter?.current_revision,
          revisions: catalogCharacter?.revisions,
          jinxes: customCharacter?.jinxes ?? catalogCharacter?.jinxes,
          name: customCharacter?.name,
          ability: customCharacter?.ability,
          image: customCharacter?.image,
        }
      })

    return resolvedCharacters.filter(
      (character): character is ResolvedScriptCharacter => character !== null,
    )
  }, [activeScript])

  const groupedScriptCharacters = useMemo<ResolvedScriptCharacterGroup[]>(
    () =>
      teamOrder
        .map((team) => ({
          team,
          characters: activeScriptCharacters.filter((character) => character.team === team),
        }))
        .filter((group) => group.characters.length > 0),
    [activeScriptCharacters],
  )

  const sheetDensityClass = useMemo(() => {
    const count = activeScriptCharacters.length

    if (count >= 25) {
      return 'sheet--dense'
    }

    if (count >= 18) {
      return 'sheet--compact'
    }

    return ''
  }, [activeScriptCharacters.length])

  const availableEditions = useMemo(
    () =>
      Array.from(new Set(allCharacters.map((character) => character.edition))).sort(
        (left, right) =>
          (editionLabels[uiLanguage][left] ?? toTitleCase(left)).localeCompare(
            editionLabels[uiLanguage][right] ?? toTitleCase(right),
          ),
      ),
    [uiLanguage],
  )

  const filteredCharacters = useMemo(() => {
    const query = characterQuery.trim().toLowerCase()

    return allCharacters.filter((character) => {
      const nameEn = getDisplayName(character.id, 'en').toLowerCase()
      const nameZh = getDisplayName(character.id, 'zh').toLowerCase()
      const abilityEn = getAbilityText(character.id, 'en').toLowerCase()
      const abilityZh = getAbilityText(character.id, 'zh').toLowerCase()
      const id = character.id.toLowerCase()
      const matchesQuery =
        !query ||
        nameEn.includes(query) ||
        nameZh.includes(query) ||
        abilityEn.includes(query) ||
        abilityZh.includes(query) ||
        id.includes(query)
      const matchesTeam =
        selectedTeams.length === 0 || selectedTeams.includes(character.team)
      const matchesEdition =
        selectedEditions.length === 0 || selectedEditions.includes(character.edition)

      return matchesQuery && matchesTeam && matchesEdition
    })
  }, [characterQuery, selectedEditions, selectedTeams])

  const filteredEditorCharacters = useMemo(() => {
    const query = editorQuery.trim().toLowerCase()

    return allCharacters.filter((character) => {
      if (!query) {
        return true
      }

      return (
        getDisplayName(character.id, 'en').toLowerCase().includes(query) ||
        getDisplayName(character.id, 'zh').toLowerCase().includes(query) ||
        character.id.toLowerCase().includes(query) ||
        getAbilityText(character.id, 'en').toLowerCase().includes(query) ||
        getAbilityText(character.id, 'zh').toLowerCase().includes(query)
      )
    })
  }, [editorQuery])

  const groupedEditorCharacters = useMemo<CharacterGroup[]>(
    () =>
      teamOrder
        .map((team) => ({
          team,
          characters: filteredEditorCharacters.filter((character) => character.team === team),
        }))
        .filter((group) => group.characters.length > 0),
    [filteredEditorCharacters],
  )

  const selectedCharacter =
    characterById[selectedCharacterId] ??
    filteredCharacters[0] ??
    allCharacters[0]

  useEffect(() => {
    if (selectedCharacter) {
      setSelectedCharacterId(selectedCharacter.id)
    }
  }, [selectedCharacter?.id])

  function updateActiveScript(
    updater: (script: EditableScript) => EditableScript,
    nextSlug?: string,
  ) {
    if (!activeScript) {
      return
    }

    const updated = updater(activeScript)
    setScripts((current) =>
      current.map((script) => (script.slug === activeScript.slug ? updated : script)),
    )

    if (nextSlug && nextSlug !== activeScript.slug) {
      setActiveSlug(nextSlug)
    }
  }

  function toggleTeam(team: Team) {
    setSelectedTeams((current) =>
      current.includes(team)
        ? current.filter((entry) => entry !== team)
        : [...current, team],
    )
  }

  function toggleEdition(edition: string) {
    setSelectedEditions((current) =>
      current.includes(edition)
        ? current.filter((entry) => entry !== edition)
        : [...current, edition],
    )
  }

  function createNewScript() {
    const baseSlug = 'new-script'
    let nextSlug = baseSlug
    let index = 2

    while (scripts.some((script) => script.slug === nextSlug)) {
      nextSlug = `${baseSlug}-${index}`
      index += 1
    }

    const nextScript: EditableScript = {
      slug: nextSlug,
      title: 'New Script',
      titleZh: 'New Script',
      author: '',
      meta: { id: '_meta', name: 'New Script' },
      customCharacters: [],
      edition: 'custom',
      characters: [],
      sourceFile: `${nextSlug}.json`,
    }

    setScripts((current) => [...current, nextScript])
    setActiveSlug(nextSlug)
    setSaveStatus('')
  }

  function toggleCharacterInScript(characterId: string) {
    updateActiveScript((script) => {
      const hasCharacter = script.characters.includes(characterId)
      return {
        ...script,
        characters: hasCharacter
          ? script.characters.filter((id) => id !== characterId)
          : sortCharacterIds([...script.characters, characterId]),
      }
    })
  }

  function downloadScriptFile() {
    if (!activeScript) {
      return
    }

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

  const handleTabChange = (_: React.SyntheticEvent, newValue: TabKey) => {
    setActiveTab(newValue)
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3, minHeight: '100vh' }}>
      <Paper elevation={0} sx={{ p: 3, mb: 2, borderRadius: 3, background: 'rgba(255,251,245,0.9)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: 'text.secondary' }}>
              Blood on the Clocktower
            </Typography>
            <Typography variant="h4" component="h1" sx={{ fontFamily: 'Georgia, "Times New Roman", serif', mt: 0.5 }}>
              {uiText.appTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 400 }}>
              {uiText.appLead}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>{uiText.language}</InputLabel>
              <Select
                value={uiLanguage}
                label={uiText.language}
                onChange={(e) => setUiLanguage(e.target.value as Language)}
              >
                <MenuItem value="en">{uiText.english}</MenuItem>
                <MenuItem value="zh">{uiText.chinese}</MenuItem>
              </Select>
            </FormControl>
            {activeTab !== 'characters' && activeTab !== 'storyteller' && activeScript && (
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={() => window.print()}
                sx={{ borderRadius: 999 }}
              >
                {uiText.print}
              </Button>
            )}
          </Box>
        </Box>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              borderRadius: 999,
              border: '1px solid',
              borderColor: 'divider',
              mr: 1,
            },
            '& .Mui-selected': {
              backgroundColor: 'rgba(133, 63, 34, 0.1)',
              borderColor: 'primary.main',
            },
          }}
        >
          <Tab label={uiText.scriptSheet} value="scripts" />
          <Tab label={uiText.settings} value="settings" />
          <Tab label={uiText.allCharacters} value="characters" />
          <Tab label={storytellerTabLabel} value="storyteller" />
        </Tabs>
      </Paper>

      {activeTab === 'scripts' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, gap: 2 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, background: 'rgba(255,251,245,0.9)', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{uiText.scriptSheet}</Typography>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={createNewScript}>
                {uiText.newScript}
              </Button>
            </Box>
            <Box sx={{ display: 'grid', gap: 1 }}>
              {scripts.map((script) => (
                <ScriptList
                  key={script.slug}
                  title={getScriptTitle(script)}
                  isActive={script.slug === activeScript?.slug}
                  onSelect={() => setActiveSlug(script.slug)}
                />
              ))}
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, background: 'rgba(255,251,245,0.9)', border: '1px solid', borderColor: 'divider' }}>
            {activeScript ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Button variant="outlined" size="small" onClick={() => setIsEditMode((current) => !current)}>
                    {isEditMode ? uiText.doneEditing : uiText.editScript}
                  </Button>
                  <Button variant="outlined" size="small" onClick={downloadScriptFile}>
                    {uiText.downloadJson}
                  </Button>
                  {saveStatus && <Typography variant="body2" color="text.secondary">{saveStatus}</Typography>}
                </Box>

                {!isEditMode ? (
                  <SheetArticle
                    activeScript={activeScript}
                    activeScriptCharacters={activeScriptCharacters}
                    groupedScriptCharacters={groupedScriptCharacters}
                    bootleggerRulesLabel={getSheetUiLabel(uiLanguage, 'bootlegger_rules')}
                    jinxesLabel={getSheetUiLabel(uiLanguage, 'jinxes')}
                    isEditMode={false}
                    language={uiLanguage}
                    onRemoveCharacter={toggleCharacterInScript}
                    sheetDensityClass={sheetDensityClass}
                    showWakeOrder={showWakeOrderPreview}
                  />
                ) : null}

                <Box sx={{ display: 'none' }} aria-hidden="true">
                  {(['en', 'zh'] as Language[]).map((language, index) => (
                    <Fragment key={language}>
                      <SheetArticle
                        activeScript={activeScript}
                        activeScriptCharacters={activeScriptCharacters}
                        groupedScriptCharacters={groupedScriptCharacters}
                        bootleggerRulesLabel={getSheetUiLabel(language, 'bootlegger_rules')}
                        jinxesLabel={getSheetUiLabel(language, 'jinxes')}
                        isEditMode={false}
                        language={language}
                        onRemoveCharacter={toggleCharacterInScript}
                        sheetDensityClass={sheetDensityClass}
                        className="print-sheet"
                        showWakeOrder
                        showEdition={false}
                        showCharacterCount={false}
                        supplementalPlacement="end"
                      />
                      {index === 0 ? <div className="print-page-break" /> : null}
                    </Fragment>
                  ))}
                </Box>

                {isEditMode ? (
                  <Box sx={{ mt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">{uiText.editScript}</Typography>
                      <Typography variant="body2" color="text.secondary">{activeScript.sourceFile}</Typography>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                      <TextField
                        label={uiText.title}
                        value={activeScript.title}
                        onChange={(e) => updateActiveScript((script) => ({ ...script, title: e.target.value }))}
                        size="small"
                      />
                      <TextField
                        label={uiText.chineseTitle}
                        value={activeScript.titleZh}
                        onChange={(e) => updateActiveScript((script) => ({ ...script, titleZh: e.target.value }))}
                        size="small"
                      />
                      <TextField
                        label={uiText.author}
                        value={activeScript.author}
                        onChange={(e) => updateActiveScript((script) => ({ ...script, author: e.target.value }))}
                        size="small"
                      />
                      <FormControl size="small">
                        <InputLabel>{uiText.editionLabel}</InputLabel>
                        <Select
                          value={activeScript.edition}
                          label={uiText.editionLabel}
                          onChange={(e) => updateActiveScript((script) => ({ ...script, edition: e.target.value }))}
                        >
                          {availableEditions.map((edition) => (
                            <MenuItem key={edition} value={edition}>
                              {editionLabels[uiLanguage][edition] ?? toTitleCase(edition)}
                            </MenuItem>
                          ))}
                          <MenuItem value="custom">{uiText.custom}</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    <EditorSection
                      activeScript={activeScript}
                      updateActiveScript={updateActiveScript}
                      uiText={uiText}
                      uiLanguage={uiLanguage}
                      editorQuery={editorQuery}
                      setEditorQuery={setEditorQuery}
                      groupedEditorCharacters={groupedEditorCharacters}
                      activeScriptCharacters={activeScriptCharacters}
                      groupedScriptCharacters={groupedScriptCharacters}
                      toggleCharacterInScript={toggleCharacterInScript}
                      teamLabels={teamLabels}
                      getDisplayName={getDisplayName}
                    />
                  </Box>
                ) : null}
              </>
            ) : (
              <Typography>{uiText.noScripts}</Typography>
            )}
          </Paper>
        </Box>
      )}

      {activeTab === 'settings' && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, background: 'rgba(255,251,245,0.9)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ textTransform: 'uppercase' }}>{uiText.export}</Typography>
              <Typography variant="h6">{uiText.pdfSettings}</Typography>
            </Box>
            <Typography>{pdfFontSize.toFixed(1)}pt</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {uiText.appLead}
            {activeScript ? ` ${uiText.currentScript}: ${getScriptTitle(activeScript)}.` : ''}
          </Typography>

          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{uiText.fontSize}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <input
                  type="range"
                  min={5.5}
                  max={30}
                  step={0.1}
                  value={pdfFontSize}
                  onChange={(e) => setPdfFontSize(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
              <TextField
                type="number"
                value={pdfFontSize}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (!Number.isNaN(v)) setPdfFontSize(Math.min(30, Math.max(5.5, v)))
                }}
                size="small"
                sx={{ width: 80 }}
              />
              <Button variant="outlined" size="small" onClick={() => setPdfFontSize(11)}>
                {uiText.reset}
              </Button>
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>{uiText.preview}</Typography>
            <FormControlLabel
              control={<Checkbox checked={showWakeOrderPreview} onChange={() => setShowWakeOrderPreview((c) => !c)} />}
              label={uiText.wakeOrderToggle}
            />
            <Typography variant="body2" component="span" sx={{ display: 'block', color: 'text.secondary' }}>{uiText.wakeOrderNote}</Typography>
          </Paper>
        </Paper>
      )}

      {activeTab === 'characters' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 380px' }, gap: 2 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, background: 'rgba(255,251,245,0.9)', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6">{uiText.allCharacters}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {filteredCharacters.length} {uiText.resultsSuffix}
                </Typography>
              </Box>
            </Box>

            <TextField
              fullWidth
              size="small"
              placeholder={uiText.searchCharacters}
              value={characterQuery}
              onChange={(e) => setCharacterQuery(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {teamOrder.map((team) => (
                <FilterCheckbox
                  key={team}
                  checked={selectedTeams.includes(team)}
                  label={teamLabels[uiLanguage][team]}
                  onChange={() => toggleTeam(team)}
                />
              ))}
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {availableEditions.map((edition) => (
                <FilterCheckbox
                  key={edition}
                  checked={selectedEditions.includes(edition)}
                  label={editionLabels[uiLanguage][edition] ?? toTitleCase(edition)}
                  onChange={() => toggleEdition(edition)}
                />
              ))}
            </Box>

            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {filteredCharacters.map((character) => {
                const icon = getIconForCharacter(character.id)
                const team = teamLabels[uiLanguage][character.team]
                const edition = editionLabels[uiLanguage][character.edition] ?? toTitleCase(character.edition)
                const currentRevision = getCurrentRevision(character.id)
                const isSelected = character.id === selectedCharacter?.id

                return (
                  <Button
                    key={character.id}
                    onClick={() => setSelectedCharacterId(character.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      p: 1.5,
                      justifyContent: 'flex-start',
                      border: isSelected ? '1px solid' : '1px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      background: isSelected ? 'rgba(133, 63, 34, 0.05)' : '#fffdf8',
                      textTransform: 'none',
                      '&:hover': { background: 'rgba(133, 63, 34, 0.08)' },
                    }}
                  >
                    {icon ? (
                      <Box component="img" src={icon} alt="" sx={{ width: 56, height: 56, borderRadius: 999, objectFit: 'contain', background: '#f2ebdf' }} />
                    ) : (
                      <Box sx={{ width: 56, height: 56, borderRadius: 999, background: '#f2ebdf', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography sx={{ fontWeight: 700, color: '#5d4730' }}>{character.id.slice(0, 2).toUpperCase()}</Typography>
                      </Box>
                    )}
                    <Box sx={{ textAlign: 'left' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontWeight: 600 }}>{getDisplayName(character.id, uiLanguage)}</Typography>
                        <Typography variant="caption" component="span" color="text.secondary">{team}</Typography>
                      </Box>
                      <Typography variant="caption" component="span" sx={{ display: 'block', color: 'text.secondary' }}>
                        {character.id} · {edition} · {currentRevision}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} dangerouslySetInnerHTML={{ __html: getAbilityText(character.id, uiLanguage) }} />
                    </Box>
                  </Button>
                )
              })}
            </Box>
          </Paper>

          <CharacterRevisionPanel
            character={selectedCharacter}
            chineseTextLabel={uiText.chineseText}
            currentLabel={uiText.current}
            currentRevisionLabel={uiText.currentRevision}
            englishTextLabel={uiText.englishText}
            language={uiLanguage}
            noCharacterSelectedLabel={uiText.noCharacterSelected}
            revisionNoteLabel={uiText.revisionNote}
            revisionHistoryLabel={uiText.revisionHistory}
            title={uiText.characterVersions}
          />
        </Box>
      )}

      {activeTab === 'storyteller' && (
        <StorytellerHelper
          activeScriptSlug={activeScript?.slug}
          activeScriptTitle={activeScript ? getScriptTitle(activeScript) : undefined}
          language={uiLanguage}
          onSelectScript={setActiveSlug}
          scriptOptions={scripts.map((script) => ({
            slug: script.slug,
            title: getScriptTitle(script),
            characters: script.characters,
          }))}
        />
      )}
    </Container>
  )
}

function EditorSection({
  activeScript,
  updateActiveScript,
  uiText,
  uiLanguage,
  editorQuery,
  setEditorQuery,
  groupedEditorCharacters,
  activeScriptCharacters,
  groupedScriptCharacters,
  toggleCharacterInScript,
  teamLabels,
  getDisplayName,
}: {
  activeScript: EditableScript
  updateActiveScript: (updater: (script: EditableScript) => EditableScript, nextSlug?: string) => void
  uiText: Record<string, string>
  uiLanguage: Language
  editorQuery: string
  setEditorQuery: (v: string) => void
  groupedEditorCharacters: CharacterGroup[]
  activeScriptCharacters: ResolvedScriptCharacter[]
  groupedScriptCharacters: ResolvedScriptCharacterGroup[]
  toggleCharacterInScript: (id: string) => void
  teamLabels: Record<Language, Record<string, string>>
  getDisplayName: (id: string, lang: Language) => string
}) {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>{uiText.bootleggerRules}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{uiText.bootleggerRulesHelp}</Typography>
      <Box sx={{ display: 'grid', gap: 1, mb: 3 }}>
        {(activeScript.meta.bootlegger ?? []).map((rule, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder={uiText.bootleggerRulePlaceholder}
              value={rule}
              onChange={(e) => updateActiveScript((script) => ({
                ...script,
                meta: { ...script.meta, bootlegger: (script.meta.bootlegger ?? []).map((r, i) => i === index ? e.target.value : r) },
              }))}
            />
            <Button size="small" variant="outlined" onClick={() => updateActiveScript((script) => ({
              ...script,
              meta: { ...script.meta, bootlegger: (script.meta.bootlegger ?? []).filter((_, i) => i !== index) },
            }))}>{uiText.remove}</Button>
          </Box>
        ))}
        <Button size="small" variant="outlined" onClick={() => updateActiveScript((script) => ({
          ...script,
          meta: { ...script.meta, bootlegger: [...(script.meta.bootlegger ?? []), ''] },
        }))}>{uiText.addRule}</Button>
      </Box>

      <Typography variant="subtitle1" sx={{ mb: 1 }}>{uiText.bootleggerRulesZh}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{uiText.bootleggerRulesZhHelp}</Typography>
      <Box sx={{ display: 'grid', gap: 1, mb: 3 }}>
        {(activeScript.meta.bootlegger_zh ?? []).map((rule, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder={uiText.bootleggerRuleZhPlaceholder}
              value={rule}
              onChange={(e) => updateActiveScript((script) => ({
                ...script,
                meta: { ...script.meta, bootlegger_zh: (script.meta.bootlegger_zh ?? []).map((r, i) => i === index ? e.target.value : r) },
              }))}
            />
            <Button size="small" variant="outlined" onClick={() => updateActiveScript((script) => ({
              ...script,
              meta: { ...script.meta, bootlegger_zh: (script.meta.bootlegger_zh ?? []).filter((_, i) => i !== index) },
            }))}>{uiText.remove}</Button>
          </Box>
        ))}
        <Button size="small" variant="outlined" onClick={() => updateActiveScript((script) => ({
          ...script,
          meta: { ...script.meta, bootlegger_zh: [...(script.meta.bootlegger_zh ?? []), ''] },
        }))}>{uiText.addRule}</Button>
      </Box>

      <Typography variant="subtitle1" sx={{ mb: 1 }}>{uiText.scriptJinxes}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{uiText.scriptJinxesHelp}</Typography>
      <Box sx={{ display: 'grid', gap: 1, mb: 3 }}>
        {(activeScript.meta.jinxes ?? []).map((jinx, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField size="small" placeholder={uiText.jinxPairPlaceholder} value={jinx.id ?? ''} onChange={(e) => updateActiveScript((script) => ({
              ...script,
              meta: { ...script.meta, jinxes: (script.meta.jinxes ?? []).map((j, i) => i === index ? { ...j, id: e.target.value } : j) },
            }))} sx={{ flex: '1 1 150px' }} />
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select value={jinx.status ?? 'active'} onChange={(e) => updateActiveScript((script) => ({
                ...script,
                meta: { ...script.meta, jinxes: (script.meta.jinxes ?? []).map((j, i) => i === index ? { ...j, status: e.target.value === 'inactive' ? 'inactive' : 'active' } : j) },
              }))}>
                <MenuItem value="active">{uiText.jinxStatusActive}</MenuItem>
                <MenuItem value="inactive">{uiText.jinxStatusInactive}</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" placeholder={uiText.jinxReasonEnPlaceholder} value={jinx.reason ?? ''} onChange={(e) => updateActiveScript((script) => ({
              ...script,
              meta: { ...script.meta, jinxes: (script.meta.jinxes ?? []).map((j, i) => i === index ? { ...j, reason: e.target.value } : j) },
            }))} sx={{ flex: '1 1 150px' }} />
            <TextField size="small" placeholder={uiText.jinxReasonZhPlaceholder} value={jinx.reason_zh ?? ''} onChange={(e) => updateActiveScript((script) => ({
              ...script,
              meta: { ...script.meta, jinxes: (script.meta.jinxes ?? []).map((j, i) => i === index ? { ...j, reason_zh: e.target.value } : j) },
            }))} sx={{ flex: '1 1 150px' }} />
            <Button size="small" variant="outlined" onClick={() => updateActiveScript((script) => ({
              ...script,
              meta: { ...script.meta, jinxes: (script.meta.jinxes ?? []).filter((_, i) => i !== index) },
            }))}>{uiText.remove}</Button>
          </Box>
        ))}
        <Button size="small" variant="outlined" onClick={() => updateActiveScript((script) => ({
          ...script,
          meta: { ...script.meta, jinxes: [...(script.meta.jinxes ?? []), { id: '', status: 'active', reason: '', reason_zh: '' }] },
        }))}>{uiText.addJinx}</Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 300px' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>{uiText.availableCharacters}</Typography>
          <TextField
            fullWidth
            size="small"
            placeholder={uiText.filterCharacters}
            value={editorQuery}
            onChange={(e) => setEditorQuery(e.target.value)}
            sx={{ mb: 2 }}
          />
          {groupedEditorCharacters.map((group) => (
            <Box key={group.team} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, mb: 1, background: getTeamColor(group.team) }}>
                <Typography variant="subtitle2" sx={{ flex: 1, fontStyle: 'italic', color: 'white' }}>{teamLabels[uiLanguage][group.team]}</Typography>
                <Typography variant="caption" sx={{ color: 'white' }}>{group.characters.length}</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                {group.characters.map((character) => (
                  <Box key={character.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Checkbox
                      checked={activeScript.characters.includes(character.id)}
                      onChange={() => toggleCharacterInScript(character.id)}
                      size="small"
                    />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{getDisplayName(character.id, uiLanguage)}</Typography>
                      <Typography variant="caption" color="text.secondary">{character.id}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{uiText.selectedCharacters}</Typography>
            <Typography variant="body2" color="text.secondary">{activeScriptCharacters.length} {uiText.selectedCount}</Typography>
          </Box>
          {groupedScriptCharacters.length > 0 ? (
            groupedScriptCharacters.map((group) => (
              <Box key={group.team} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, mb: 1, background: getTeamColor(group.team) }}>
                  <Typography variant="subtitle2" sx={{ flex: 1, fontStyle: 'italic', color: 'white' }}>{teamLabels[uiLanguage][group.team]}</Typography>
                  <Typography variant="caption" sx={{ color: 'white' }}>{group.characters.length}</Typography>
                </Box>
                {group.characters.map((character) => (
                  <Box key={character.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{character.name ?? getDisplayName(character.id, uiLanguage)}</Typography>
                      <Typography variant="caption" color="text.secondary">{character.id}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => toggleCharacterInScript(character.id)}>
                      ×
                    </IconButton>
                  </Box>
                ))}
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">{uiText.noCharacters}</Typography>
          )}
        </Paper>
      </Box>
    </Box>
  )
}

function getTeamColor(team: string) {
  const colors: Record<string, string> = {
    townsfolk: '#2f6b6a',
    outsider: '#7f6a3a',
    minion: '#8d4031',
    demon: '#482121',
    traveler: '#4f5870',
    fabled: '#5c4a3d',
    loric: '#3c5268',
  }
  return colors[team] || '#666'
}