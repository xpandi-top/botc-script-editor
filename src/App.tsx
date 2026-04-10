import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'
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
  const [activeSlug, setActiveSlug] = useState<string>(initialScripts[0]?.slug ?? '')
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

  return (
    <main
      className="app-shell"
      style={{ '--pdf-font-size': `${pdfFontSize}pt` } as CSSProperties}
    >
      <section className="app-hero">
        <div>
          <p className="app-hero__kicker">Blood on the Clocktower</p>
          <h1>{uiText.appTitle}</h1>
          <p className="app-hero__lede">{uiText.appLead}</p>
        </div>
        <div className="script-toolbar">
          <label className="editor-field">
            <span>{uiText.language}</span>
            <select
              onChange={(event) => setUiLanguage(event.target.value as Language)}
              value={uiLanguage}
            >
              <option value="en">{uiText.english}</option>
              <option value="zh">{uiText.chinese}</option>
            </select>
          </label>
          {activeTab !== 'characters' && activeTab !== 'storyteller' && activeScript ? (
            <button className="print-button" type="button" onClick={() => window.print()}>
              {uiText.print}
            </button>
          ) : null}
        </div>
      </section>

      <div className="tab-bar">
        <button
          className={`tab-button${activeTab === 'scripts' ? ' tab-button--active' : ''}`}
          onClick={() => setActiveTab('scripts')}
          type="button"
        >
          {uiText.scriptSheet}
        </button>
        <button
          className={`tab-button${activeTab === 'settings' ? ' tab-button--active' : ''}`}
          onClick={() => setActiveTab('settings')}
          type="button"
        >
          {uiText.settings}
        </button>
        <button
          className={`tab-button${activeTab === 'characters' ? ' tab-button--active' : ''}`}
          onClick={() => setActiveTab('characters')}
          type="button"
        >
          {uiText.allCharacters}
        </button>
        <button
          className={`tab-button${activeTab === 'storyteller' ? ' tab-button--active' : ''}`}
          onClick={() => setActiveTab('storyteller')}
          type="button"
        >
          {storytellerTabLabel}
        </button>
      </div>

      {activeTab === 'scripts' ? (
        <section className="app-grid">
          <aside className="script-list">
            <div className="section-heading">
              <h2>{uiText.scriptSheet}</h2>
              <button className="secondary-button" onClick={createNewScript} type="button">
                {uiText.newScript}
              </button>
            </div>
            <div className="script-list__items">
              {scripts.map((script) => (
                <ScriptList
                  key={script.slug}
                  title={getScriptTitle(script)}
                  isActive={script.slug === activeScript?.slug}
                  onSelect={() => setActiveSlug(script.slug)}
                />
              ))}
            </div>
          </aside>

          <section className="viewer-panel">
            {activeScript ? (
              <>
                <div className="script-toolbar">
                  <button
                    className="secondary-button"
                    onClick={() => setIsEditMode((current) => !current)}
                    type="button"
                  >
                    {isEditMode ? uiText.doneEditing : uiText.editScript}
                  </button>
                  <button className="secondary-button" onClick={downloadScriptFile} type="button">
                    {uiText.downloadJson}
                  </button>
                  {saveStatus ? <span className="save-status">{saveStatus}</span> : null}
                </div>

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

                <div className="print-sheets" aria-hidden="true">
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
                </div>

                {isEditMode ? (
                  <section className="script-editor">
                    <div className="section-heading">
                      <h2>{uiText.editScript}</h2>
                      <span>{activeScript.sourceFile}</span>
                    </div>

                    <div className="script-editor__fields">
                      <label className="editor-field">
                        <span>{uiText.title}</span>
                        <input
                          onChange={(event) =>
                            updateActiveScript((script) => ({
                              ...script,
                              title: event.target.value,
                            }))
                          }
                          type="text"
                          value={activeScript.title}
                        />
                      </label>

                      <label className="editor-field">
                        <span>{uiText.chineseTitle}</span>
                        <input
                          onChange={(event) =>
                            updateActiveScript((script) => ({
                              ...script,
                              titleZh: event.target.value,
                            }))
                          }
                          type="text"
                          value={activeScript.titleZh}
                        />
                      </label>

                      <label className="editor-field">
                        <span>{uiText.author}</span>
                        <input
                          onChange={(event) =>
                            updateActiveScript((script) => ({
                              ...script,
                              author: event.target.value,
                            }))
                          }
                          type="text"
                          value={activeScript.author}
                        />
                      </label>

                      <label className="editor-field">
                        <span>{uiText.editionLabel}</span>
                        <select
                          onChange={(event) =>
                            updateActiveScript((script) => ({
                              ...script,
                              edition: event.target.value,
                            }))
                          }
                          value={activeScript.edition}
                        >
                          {availableEditions.map((edition) => (
                            <option key={edition} value={edition}>
                              {editionLabels[uiLanguage][edition] ?? toTitleCase(edition)}
                            </option>
                          ))}
                          <option value="custom">{uiText.custom}</option>
                        </select>
                      </label>
                    </div>

                    <div className="editor-field">
                      <div className="section-heading">
                        <span>{uiText.bootleggerRules}</span>
                        <button
                          className="secondary-button"
                          onClick={() =>
                            updateActiveScript((script) => ({
                              ...script,
                              meta: {
                                ...script.meta,
                                bootlegger: [...(script.meta.bootlegger ?? []), ''],
                              },
                            }))
                          }
                          type="button"
                        >
                          {uiText.addRule}
                        </button>
                      </div>
                      <span>{uiText.bootleggerRulesHelp}</span>
                      <div className="bootlegger-rules">
                        {(activeScript.meta.bootlegger ?? []).map((rule, index) => (
                          <div className="bootlegger-rule" key={index}>
                            <input
                              onChange={(event) =>
                                updateActiveScript((script) => ({
                                  ...script,
                                  meta: {
                                    ...script.meta,
                                    bootlegger: (script.meta.bootlegger ?? []).map((entry, entryIndex) =>
                                      entryIndex === index ? event.target.value : entry,
                                    ),
                                  },
                                }))
                              }
                              placeholder={uiText.bootleggerRulePlaceholder}
                              type="text"
                              value={rule}
                            />
                            <button
                              className="secondary-button"
                              onClick={() =>
                                updateActiveScript((script) => ({
                                  ...script,
                                  meta: {
                                    ...script.meta,
                                    bootlegger: (script.meta.bootlegger ?? []).filter(
                                      (_, entryIndex) => entryIndex !== index,
                                    ),
                                  },
                                }))
                              }
                              type="button"
                            >
                              {uiText.remove}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="editor-field">
                      <div className="section-heading">
                        <span>{uiText.bootleggerRulesZh}</span>
                        <button
                          className="secondary-button"
                          onClick={() =>
                            updateActiveScript((script) => ({
                              ...script,
                              meta: {
                                ...script.meta,
                                bootlegger_zh: [...(script.meta.bootlegger_zh ?? []), ''],
                              },
                            }))
                          }
                          type="button"
                        >
                          {uiText.addRule}
                        </button>
                      </div>
                      <span>{uiText.bootleggerRulesZhHelp}</span>
                      <div className="bootlegger-rules">
                        {(activeScript.meta.bootlegger_zh ?? []).map((rule, index) => (
                          <div className="bootlegger-rule" key={index}>
                            <input
                              onChange={(event) =>
                                updateActiveScript((script) => ({
                                  ...script,
                                  meta: {
                                    ...script.meta,
                                    bootlegger_zh: (script.meta.bootlegger_zh ?? []).map(
                                      (entry, entryIndex) =>
                                        entryIndex === index ? event.target.value : entry,
                                    ),
                                  },
                                }))
                              }
                              placeholder={uiText.bootleggerRuleZhPlaceholder}
                              type="text"
                              value={rule}
                            />
                            <button
                              className="secondary-button"
                              onClick={() =>
                                updateActiveScript((script) => ({
                                  ...script,
                                  meta: {
                                    ...script.meta,
                                    bootlegger_zh: (script.meta.bootlegger_zh ?? []).filter(
                                      (_, entryIndex) => entryIndex !== index,
                                    ),
                                  },
                                }))
                              }
                              type="button"
                            >
                              {uiText.remove}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="editor-field">
                      <div className="section-heading">
                        <span>{uiText.scriptJinxes}</span>
                        <button
                          className="secondary-button"
                          onClick={() =>
                            updateActiveScript((script) => ({
                              ...script,
                              meta: {
                                ...script.meta,
                                jinxes: [
                                  ...(script.meta.jinxes ?? []),
                                  {
                                    id: '',
                                    status: 'active',
                                    reason: '',
                                    reason_zh: '',
                                  },
                                ],
                              },
                            }))
                          }
                          type="button"
                        >
                          {uiText.addJinx}
                        </button>
                      </div>
                      <span>{uiText.scriptJinxesHelp}</span>
                      <div className="script-jinxes">
                        {(activeScript.meta.jinxes ?? []).map((jinx, index) => (
                          <div className="script-jinx" key={index}>
                            <input
                              onChange={(event) =>
                                updateActiveScript((script) => ({
                                  ...script,
                                  meta: {
                                    ...script.meta,
                                    jinxes: (script.meta.jinxes ?? []).map((entry, entryIndex) =>
                                      entryIndex === index ? { ...entry, id: event.target.value } : entry,
                                    ),
                                  },
                                }))
                              }
                              placeholder={uiText.jinxPairPlaceholder}
                              type="text"
                              value={jinx.id ?? ''}
                            />
                            <select
                              aria-label={uiText.jinxStatus}
                              onChange={(event) =>
                                updateActiveScript((script) => ({
                                  ...script,
                                  meta: {
                                    ...script.meta,
                                    jinxes: (script.meta.jinxes ?? []).map((entry, entryIndex) =>
                                      entryIndex === index
                                        ? {
                                            ...entry,
                                            status:
                                              event.target.value === 'inactive' ? 'inactive' : 'active',
                                          }
                                        : entry,
                                    ),
                                  },
                                }))
                              }
                              value={jinx.status ?? 'active'}
                            >
                              <option value="active">{uiText.jinxStatusActive}</option>
                              <option value="inactive">{uiText.jinxStatusInactive}</option>
                            </select>
                            <input
                              onChange={(event) =>
                                updateActiveScript((script) => ({
                                  ...script,
                                  meta: {
                                    ...script.meta,
                                    jinxes: (script.meta.jinxes ?? []).map((entry, entryIndex) =>
                                      entryIndex === index
                                        ? { ...entry, reason: event.target.value }
                                        : entry,
                                    ),
                                  },
                                }))
                              }
                              placeholder={uiText.jinxReasonEnPlaceholder}
                              type="text"
                              value={jinx.reason ?? ''}
                            />
                            <input
                              onChange={(event) =>
                                updateActiveScript((script) => ({
                                  ...script,
                                  meta: {
                                    ...script.meta,
                                    jinxes: (script.meta.jinxes ?? []).map((entry, entryIndex) =>
                                      entryIndex === index
                                        ? { ...entry, reason_zh: event.target.value }
                                        : entry,
                                    ),
                                  },
                                }))
                              }
                              placeholder={uiText.jinxReasonZhPlaceholder}
                              type="text"
                              value={jinx.reason_zh ?? ''}
                            />
                            <button
                              className="secondary-button"
                              onClick={() =>
                                updateActiveScript((script) => ({
                                  ...script,
                                  meta: {
                                    ...script.meta,
                                    jinxes: (script.meta.jinxes ?? []).filter(
                                      (_, entryIndex) => entryIndex !== index,
                                    ),
                                  },
                                }))
                              }
                              type="button"
                            >
                              {uiText.remove}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="script-editor__layout">
                      <div className="script-editor__picker">
                        <div className="section-heading">
                          <h2>{uiText.availableCharacters}</h2>
                        </div>
                        <label className="editor-field">
                          <span>{uiText.characterSearch}</span>
                          <input
                            onChange={(event) => setEditorQuery(event.target.value)}
                            placeholder={uiText.filterCharacters}
                            type="search"
                            value={editorQuery}
                          />
                        </label>

                        <div className="editor-groups">
                          {groupedEditorCharacters.map((group) => (
                            <section className="editor-group" key={group.team}>
                              <div className={`team-group__heading team-group__heading--${group.team}`}>
                                <h3>{teamLabels[uiLanguage][group.team]}</h3>
                                <span>{group.characters.length}</span>
                              </div>
                              <div className="editor-character-list">
                                {group.characters.map((character) => (
                                  <label className="editor-character" key={character.id}>
                                    <input
                                      checked={activeScript.characters.includes(character.id)}
                                      onChange={() => toggleCharacterInScript(character.id)}
                                      type="checkbox"
                                    />
                                    <div>
                                      <strong>{getDisplayName(character.id, uiLanguage)}</strong>
                                      <p>{character.id}</p>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>
                      </div>

                      <aside className="script-editor__selected">
                        <div className="section-heading">
                          <h2>{uiText.selectedCharacters}</h2>
                          <span>
                            {activeScriptCharacters.length} {uiText.selectedCount}
                          </span>
                        </div>

                        <div className="editor-selected-groups">
                          {groupedScriptCharacters.length > 0 ? (
                            groupedScriptCharacters.map((group) => (
                              <section className="editor-group" key={group.team}>
                                <div className={`team-group__heading team-group__heading--${group.team}`}>
                                  <h3>{teamLabels[uiLanguage][group.team]}</h3>
                                  <span>{group.characters.length}</span>
                                </div>
                                <div className="editor-selected-list">
                                  {group.characters.map((character) => (
                                    <div className="editor-selected-item" key={character.id}>
                                      <div className="editor-selected-item__top">
                                        <strong>
                                          {character.name ?? getDisplayName(character.id, uiLanguage)}
                                        </strong>
                                        <button
                                          aria-label={`Remove ${character.name ?? character.id}`}
                                          className="editor-selected-remove"
                                          onClick={() => toggleCharacterInScript(character.id)}
                                          type="button"
                                        >
                                          x
                                        </button>
                                      </div>
                                      <p>{character.id}</p>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            ))
                          ) : (
                            <p className="editor-selected-empty">{uiText.noCharacters}</p>
                          )}
                        </div>
                      </aside>
                    </div>
                  </section>
                ) : null}
              </>
            ) : (
              <p>{uiText.noScripts}</p>
            )}
          </section>
        </section>
      ) : activeTab === 'settings' ? (
        <section className="viewer-panel settings-panel">
          <div className="viewer-panel__header">
            <div>
              <p className="viewer-panel__eyebrow">{uiText.export}</p>
              <h2>{uiText.pdfSettings}</h2>
            </div>
            <span>{pdfFontSize.toFixed(1)}pt</span>
          </div>
          <p className="settings-panel__copy">
            {uiText.appLead}
            {activeScript ? ` ${uiText.currentScript}: ${getScriptTitle(activeScript)}.` : ''}
          </p>

          <section className="pdf-settings">
            <div className="pdf-settings__controls">
              <label className="editor-field">
                <span>{uiText.fontSize}</span>
                <input
                  max="30"
                  min="5.5"
                  onChange={(event) => setPdfFontSize(Number(event.target.value))}
                  step="0.1"
                  type="range"
                  value={pdfFontSize}
                />
              </label>
              <label className="editor-field">
                <span>{uiText.fontSizePt}</span>
                <input
                  max="30"
                  min="5.5"
                  onChange={(event) => {
                    const nextValue = Number(event.target.value)
                    if (Number.isNaN(nextValue)) {
                      return
                    }

                    setPdfFontSize(Math.min(30, Math.max(5.5, nextValue)))
                  }}
                  step="0.1"
                  type="number"
                  value={pdfFontSize}
                />
              </label>
              <button
                className="secondary-button"
                onClick={() => setPdfFontSize(11)}
                type="button"
              >
                {uiText.reset}
              </button>
            </div>
          </section>

          <section className="pdf-settings">
            <div className="section-heading">
              <h2>{uiText.preview}</h2>
            </div>
            <label className="toggle-field">
              <input
                checked={showWakeOrderPreview}
                onChange={() => setShowWakeOrderPreview((current) => !current)}
                type="checkbox"
              />
              <span>{uiText.wakeOrderToggle}</span>
            </label>
            <p className="settings-panel__note">{uiText.wakeOrderNote}</p>
          </section>
        </section>
      ) : activeTab === 'characters' ? (
        <section className="browser-layout">
          <section className="browser-panel">
          <div className="browser-panel__header">
            <div>
              <h2>{uiText.allCharacters}</h2>
              <p>
                {filteredCharacters.length} {uiText.resultsSuffix}
              </p>
            </div>
            <div className="browser-controls">
              <input
                aria-label="Search characters"
                className="browser-search"
                onChange={(event) => setCharacterQuery(event.target.value)}
                placeholder={uiText.searchCharacters}
                type="search"
                value={characterQuery}
              />
              <div className="filter-row">
                {teamOrder.map((team) => (
                  <FilterCheckbox
                    checked={selectedTeams.includes(team)}
                    key={team}
                    label={teamLabels[uiLanguage][team]}
                    onChange={() => toggleTeam(team)}
                  />
                ))}
              </div>
              <div className="filter-row">
                {availableEditions.map((edition) => (
                  <FilterCheckbox
                    checked={selectedEditions.includes(edition)}
                    key={edition}
                    label={editionLabels[uiLanguage][edition] ?? toTitleCase(edition)}
                    onChange={() => toggleEdition(edition)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="browser-list">
            {filteredCharacters.map((character) => {
              const icon = getIconForCharacter(character.id)
              const team = teamLabels[uiLanguage][character.team]
              const edition =
                editionLabels[uiLanguage][character.edition] ?? toTitleCase(character.edition)
              const currentRevision = getCurrentRevision(character.id)
              const isSelected = character.id === selectedCharacter?.id

              return (
                <button
                  className={`browser-card${isSelected ? ' browser-card--selected' : ''}`}
                  key={character.id}
                  onClick={() => setSelectedCharacterId(character.id)}
                  type="button"
                >
                  {icon ? (
                    <img alt="" className="browser-card__icon" src={icon} />
                  ) : (
                    <div className="browser-card__icon browser-card__icon--placeholder">
                      {character.id.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="browser-card__body">
                    <div className="browser-card__topline">
                      <h3>{getDisplayName(character.id, uiLanguage)}</h3>
                      <span>{team}</span>
                    </div>
                    <p className="browser-card__id">
                      {character.id} · {edition} · {currentRevision}
                    </p>
                    <p
                      dangerouslySetInnerHTML={{
                        __html: getAbilityText(character.id, uiLanguage),
                      }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
          </section>

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
        </section>
      ) : (
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
    </main>
  )
}
