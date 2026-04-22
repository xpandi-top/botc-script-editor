import { Fragment } from 'react'
import { Box, Button, Paper, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { ScriptList } from '../ScriptList'
import { SheetArticle } from '../SheetArticle'
import { ScriptEditor } from './ScriptEditor'
import type {
  CharacterGroup,
  EditableScript,
  Language,
  ResolvedScriptCharacter,
  ResolvedScriptCharacterGroup,
} from '../../types'

type Props = {
  scripts: EditableScript[]
  activeScript: EditableScript | undefined
  uiText: Record<string, string>
  uiLanguage: Language
  isEditMode: boolean
  showWakeOrderPreview: boolean
  saveStatus: string
  activeScriptCharacters: ResolvedScriptCharacter[]
  groupedScriptCharacters: ResolvedScriptCharacterGroup[]
  groupedEditorCharacters: CharacterGroup[]
  editorQuery: string
  availableEditions: string[]
  sheetDensityClass: string
  setIsEditMode: (v: boolean | ((c: boolean) => boolean)) => void
  setEditorQuery: (v: string) => void
  setActiveSlug: (slug: string) => void
  createNewScript: () => void
  downloadScriptFile: () => void
  updateActiveScript: (updater: (script: EditableScript) => EditableScript, nextSlug?: string) => void
  toggleCharacterInScript: (id: string) => void
  getScriptTitle: (script: EditableScript) => string
  getSheetUiLabel: (language: Language, key: string) => string
}

export function ScriptsTab({
  scripts,
  activeScript,
  uiText,
  uiLanguage,
  isEditMode,
  showWakeOrderPreview,
  saveStatus,
  activeScriptCharacters,
  groupedScriptCharacters,
  groupedEditorCharacters,
  editorQuery,
  availableEditions,
  sheetDensityClass,
  setIsEditMode,
  setEditorQuery,
  setActiveSlug,
  createNewScript,
  downloadScriptFile,
  updateActiveScript,
  toggleCharacterInScript,
  getScriptTitle,
  getSheetUiLabel,
}: Props) {
  return (
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
              <Button variant="outlined" size="small" onClick={() => setIsEditMode((c) => !c)}>
                {isEditMode ? uiText.doneEditing : uiText.editScript}
              </Button>
              <Button variant="outlined" size="small" onClick={downloadScriptFile}>
                {uiText.downloadJson}
              </Button>
              {saveStatus && <Typography variant="body2" color="text.secondary">{saveStatus}</Typography>}
            </Box>

            {!isEditMode && (
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
            )}

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

            {isEditMode && (
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{uiText.editScript}</Typography>
                  <Typography variant="body2" color="text.secondary">{activeScript.sourceFile}</Typography>
                </Box>
                <ScriptEditor
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
                  availableEditions={availableEditions}
                />
              </Box>
            )}
          </>
        ) : (
          <Typography>{uiText.noScripts}</Typography>
        )}
      </Paper>
    </Box>
  )
}
