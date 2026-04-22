import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import type { EditableScript, Language } from '../../types'

type Props = {
  uiText: Record<string, string>
  activeScript: EditableScript | undefined
  pdfFontSize: number
  showWakeOrderPreview: boolean
  setPdfFontSize: (v: number) => void
  setShowWakeOrderPreview: (v: boolean | ((c: boolean) => boolean)) => void
  getScriptTitle: (script: EditableScript) => string
  uiLanguage: Language
}

export function SettingsTab({
  uiText,
  activeScript,
  pdfFontSize,
  showWakeOrderPreview,
  setPdfFontSize,
  setShowWakeOrderPreview,
  getScriptTitle,
}: Props) {
  return (
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
        <Typography variant="body2" component="span" sx={{ display: 'block', color: 'text.secondary' }}>
          {uiText.wakeOrderNote}
        </Typography>
      </Paper>
    </Paper>
  )
}
