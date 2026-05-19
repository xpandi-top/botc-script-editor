/**
 * AgentButton — small "✨ AI" icon button that runs an agent action.
 * Shows a loading spinner while pending, snackbar on error.
 *
 * Usage:
 *   <AgentButton
 *     label="Suggest ZH name"
 *     action={async () => { const r = await suggestChineseName(name); setNameZh(r.name) }}
 *   />
 */
import { useState } from 'react'
import { IconButton, CircularProgress, Tooltip, Snackbar } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { isGeminiAvailable } from '../lib/gemini'

type Props = {
  label: string
  action: () => Promise<void>
  /** Override icon */
  icon?: React.ReactNode
  size?: 'small' | 'medium'
  disabled?: boolean
}

export function AgentButton({ label, action, icon, size = 'small', disabled }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isGeminiAvailable()) return null

  const handleClick = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Tooltip title={label} arrow>
        <span>
          <IconButton
            size={size}
            onClick={handleClick}
            disabled={disabled || loading}
            sx={{
              color: 'primary.main',
              opacity: 0.8,
              '&:hover': { opacity: 1, bgcolor: 'primary.50' },
              p: 0.25,
            }}
          >
            {loading
              ? <CircularProgress size={14} color="inherit" />
              : (icon ?? <AutoAwesomeIcon sx={{ fontSize: 16 }} />)
            }
          </IconButton>
        </span>
      </Tooltip>
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={4000}
        onClose={() => setError('')}
        message={`AI error: ${error}`}
      />
    </>
  )
}
