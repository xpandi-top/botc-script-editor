import React from 'react'
import { Box, Typography, Button, Paper } from '@mui/material'
import ErrorIcon from '@mui/icons-material/Error'
import RefreshIcon from '@mui/icons-material/Refresh'
import { recordError } from '../lib/feedback/errors'
import { FeedbackButton } from './Feedback'

interface Props {
  children: React.ReactNode
  /** Tab/section name shown in error message */
  name?: string
  /** Fallback UI override */
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    // Log for debugging — visible in Safari Web Inspector
    console.error('[ErrorBoundary]', this.props.name ?? 'Component', 'crashed:', error, errorInfo)
    // Goes with the next problem report.
    recordError(error, this.props.name ?? 'ErrorBoundary')
  }

  /** Dynamic import() failures (stale/missing chunk) — React.lazy caches the
   *  rejected promise forever, so resetting state alone re-renders the same
   *  dead lazy component. Only a hard reload re-fetches a working chunk URL. */
  isChunkLoadError(error: Error | null): boolean {
    const msg = error?.message ?? ''
    return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk .* failed/i.test(
      msg
    )
  }

  handleReset = () => {
    if (this.isChunkLoadError(this.state.error)) {
      window.location.reload()
      return
    }
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    const { error } = this.state
    const name = this.props.name ?? 'This section'

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          p: 2,
          width: '100%',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'error.main',
            bgcolor: 'error.light',
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <ErrorIcon color="error" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h6" color="error.dark" gutterBottom>
            {name} failed to load
          </Typography>
          {error && (
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                bgcolor: 'background.paper',
                p: 1,
                borderRadius: 1,
                mb: 2,
                wordBreak: 'break-all',
                textAlign: 'left',
              }}
            >
              {error.message || String(error)}
            </Typography>
          )}
          <Button
            variant="outlined"
            color="error"
            startIcon={<RefreshIcon />}
            onClick={this.handleReset}
            size="small"
          >
            Retry
          </Button>
          {/* Report the crash: the error goes with it (recordError above). */}
          <FeedbackButton
            sx={{ ml: 1, color: 'error.dark' }}
            request={() => ({ target: { type: 'page' }, surface: `crash/${this.props.name ?? 'unknown'}`, label: `${name} crashed`, issues: ['bug'] })}
          />
        </Paper>
      </Box>
    )
  }
}

/**
 * Lightweight HOC — wrap a component tree with an error boundary.
 * Usage: <WithErrorBoundary name="Storyteller"><StorytellerHelper /></WithErrorBoundary>
 */
export function WithErrorBoundary({
  name,
  children,
}: {
  name?: string
  children: React.ReactNode
}) {
  return <ErrorBoundary name={name}>{children}</ErrorBoundary>
}
