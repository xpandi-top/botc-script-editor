import { useRef, useState } from 'react'
import { Box, IconButton, TextField, Tooltip, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FolderIcon from '@mui/icons-material/Folder'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import type { Language, ScriptFolder } from '../../types'
import { useT } from '../../context/I18nContext'

type Props = {
  folder: ScriptFolder
  count: number
  language: Language
  onToggle: () => void
  onRename: (name: string) => void
  onDelete: () => void
  children: React.ReactNode
}

export function ScriptFolderRow({ folder, count, onToggle, onRename, onDelete, children }: Props) {
  const { t } = useT()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(folder.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const open = !folder.collapsed

  function commitRename() {
    const name = draft.trim()
    if (name && name !== folder.name) onRename(name)
    else setDraft(folder.name)
    setEditing(false)
  }

  return (
    <Box>
      {/* ── Folder header ── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.25,
        py: 0.25, px: 0.5, borderRadius: 1,
        '&:hover .folder-actions': { opacity: 1 },
      }}>
        {/* Expand icon */}
        <IconButton size="small" onClick={onToggle} sx={{ p: 0.25 }}>
          {open
            ? <ExpandLessIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
            : <ExpandMoreIcon sx={{ fontSize: 13, color: 'text.secondary' }} />}
        </IconButton>

        {/* Folder icon */}
        {open
          ? <FolderOpenIcon sx={{ fontSize: 14, color: 'warning.main', flexShrink: 0 }} />
          : <FolderIcon sx={{ fontSize: 14, color: 'warning.main', flexShrink: 0 }} />}

        {/* Name (or input when editing) */}
        {editing ? (
          <TextField
            inputRef={inputRef}
            size="small"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setDraft(folder.name); setEditing(false) }
            }}
            autoFocus
            sx={{
              flex: 1, minWidth: 0,
              '& .MuiInputBase-input': { py: '2px', px: '6px', fontSize: '0.78rem' },
              '& .MuiOutlinedInput-root': { borderRadius: 1 },
            }}
          />
        ) : (
          <Typography
            variant="overline"
            onClick={() => { setEditing(true); setDraft(folder.name) }}
            sx={{
              flex: 1, fontSize: '0.6rem', lineHeight: 1, cursor: 'text',
              color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            title={t('click_to_rename')}
          >
            {folder.name} ({count})
          </Typography>
        )}

        {/* Action buttons — hidden until hover */}
        <Box className="folder-actions" sx={{ display: 'flex', gap: 0, opacity: 0, transition: 'opacity 0.1s', flexShrink: 0 }}>
          <Tooltip title={t('rename_folder')}>
            <IconButton size="small" sx={{ p: '2px' }}
              onClick={() => { setEditing(true); setDraft(folder.name) }}>
              <DriveFileRenameOutlineIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('delete_folder')}>
            <IconButton size="small" color="error" sx={{ p: '2px', opacity: 0.6, '&:hover': { opacity: 1 } }}
              onClick={onDelete}>
              <DeleteIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Folder contents ── */}
      {open && (
        <Box sx={{ pl: 1.5, borderLeft: '2px solid', borderColor: 'warning.main', ml: 1, opacity: 0.9 }}>
          {count > 0 ? children : (
            <Typography variant="caption" color="text.disabled"
              sx={{ pl: 0.5, fontStyle: 'italic', fontSize: '0.72rem' }}>
              {t('empty_folder')}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  )
}

// ── New-folder button ─────────────────────────────────────────────────────────

type NewFolderButtonProps = {
  language: Language
  onCreate: (name: string) => void
}

export function NewFolderButton({ onCreate }: NewFolderButtonProps) {
  const { t } = useT()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  function commit() {
    const n = name.trim()
    if (n) onCreate(n)
    setName('')
    setAdding(false)
  }

  if (!adding) {
    return (
      <Tooltip title={t('new_folder')}>
        <IconButton size="small" onClick={() => setAdding(true)}
          sx={{ opacity: 0.45, '&:hover': { opacity: 1 } }}>
          <AddIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
    )
  }

  return (
    <TextField
      size="small"
      autoFocus
      placeholder={t('folder_name')}
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={() => { if (name.trim()) commit(); else setAdding(false) }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') { setName(''); setAdding(false) }
      }}
      sx={{
        flex: 1,
        '& .MuiInputBase-input': { py: '3px', px: '8px', fontSize: '0.78rem' },
        '& .MuiOutlinedInput-root': { borderRadius: 1.5 },
      }}
    />
  )
}
