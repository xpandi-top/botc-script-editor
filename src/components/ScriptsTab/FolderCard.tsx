import { useEffect, useRef, useState } from 'react'
import {
  Box, Chip, Divider, IconButton,
  ListItemIcon, ListItemText, Menu, MenuItem, TextField, Typography,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import type { EditableScript, Language, ScriptFolder } from '../../types'

type Props = {
  folder: ScriptFolder
  scripts: EditableScript[]
  language: Language
  onOpen: () => void
  onRename: (name: string) => void
  onDelete: () => void
}

export function FolderCard({ folder, scripts, language, onOpen, onRename, onDelete }: Props) {
  const zh = language === 'zh'
  const preview = scripts.slice(0, 5)
  const [hovered, setHovered] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(folder.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuOpen = Boolean(menuAnchor)
  const showActions = hovered || menuOpen

  // Focus input when rename mode activates
  useEffect(() => {
    if (renaming) {
      // Defer to let MUI finish rendering
      const id = setTimeout(() => inputRef.current?.select(), 50)
      return () => clearTimeout(id)
    }
  }, [renaming])

  const openMenu = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    setMenuAnchor(e.currentTarget)
  }
  const closeMenu = () => setMenuAnchor(null)

  const startRename = () => {
    setRenameValue(folder.name)
    setRenaming(true)
    closeMenu()
  }

  const commitRename = () => {
    const v = renameValue.trim()
    if (v && v !== folder.name) onRename(v)
    setRenaming(false)
  }

  const cancelRename = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setRenameValue(folder.name)
    setRenaming(false)
  }

  return (
    <>
      <Box
        role={renaming ? undefined : 'button'}
        tabIndex={renaming ? undefined : 0}
        onClick={renaming ? undefined : onOpen}
        onKeyDown={(e) => { if (!renaming && (e.key === 'Enter' || e.key === ' ')) onOpen() }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          borderRadius: 2.5,
          overflow: 'hidden',
          cursor: renaming ? 'default' : 'pointer',
          userSelect: 'none',
          border: '2px dashed',
          borderColor: renaming ? 'primary.main' : 'divider',
          bgcolor: 'background.paper',
          minHeight: 210,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          transition: 'all 0.15s ease',
          '&:hover': renaming ? undefined : {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
            transform: 'translateY(-3px)',
            boxShadow: '0 8px 22px rgba(0,0,0,0.18)',
          },
          '&:focus-visible': {
            outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2,
          },
        }}
      >
        {/* ── Header ── */}
        <Box sx={{
          px: 1.5, pt: 1.25, pb: 0.85,
          display: 'flex', alignItems: 'center', gap: 0.75,
          borderBottom: '1px solid', borderColor: 'divider',
        }}>
          <FolderOpenIcon sx={{ color: 'warning.main', fontSize: 22, flexShrink: 0 }} />
          {renaming ? (
            <>
              <TextField
                inputRef={inputRef}
                size="small"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') cancelRename()
                }}
                slotProps={{ input: { sx: { fontSize: '0.875rem', py: '3px' } } }}
                sx={{ flex: 1 }}
              />
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); commitRename() }}
                sx={{ color: 'success.main', flexShrink: 0 }}>
                <CheckIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton size="small" onClick={cancelRename}
                sx={{ color: 'text.disabled', flexShrink: 0 }}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </>
          ) : (
            <>
              <Typography sx={{
                fontWeight: 700, fontSize: '0.75rem', flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary',
              }}>
                {folder.name}
              </Typography>
              <Chip size="small" label={scripts.length}
                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, flexShrink: 0, '& .MuiChip-label': { px: '6px' } }} />
            </>
          )}
        </Box>

        {/* ── Script preview list ── */}
        <Box sx={{ px: 1.5, py: 1.1, flex: 1 }}>
          {scripts.length === 0 ? (
            <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', fontStyle: 'italic' }}>
              {zh ? '（空文件夹）' : '(empty folder)'}
            </Typography>
          ) : (
            <>
              {preview.map((s) => (
                <Box key={s.slug} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: '2px' }}>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />
                  <Typography sx={{
                    fontSize: '0.72rem', color: 'text.secondary',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.55,
                  }}>
                    {(zh && s.titleZh) ? s.titleZh : s.title}
                  </Typography>
                </Box>
              ))}
              {scripts.length > 5 && (
                <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', mt: 0.5, fontStyle: 'italic' }}>
                  +{scripts.length - 5} {zh ? '更多…' : 'more…'}
                </Typography>
              )}
            </>
          )}
        </Box>

        {/* ── Three-dot action button (hover, hidden when renaming) ── */}
        {!renaming && (
          <Box sx={{
            position: 'absolute', top: 7, right: 7,
            opacity: showActions ? 1 : 0,
            transition: 'opacity 0.15s ease',
          }}>
            <IconButton size="small" onClick={openMenu}
              sx={{ bgcolor: 'action.selected', width: 26, height: 26, '&:hover': { bgcolor: 'action.focus' } }}>
              <MoreVertIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* ── Action menu ── */}
      <Menu anchorEl={menuAnchor} open={menuOpen} onClose={closeMenu}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { sx: { minWidth: 150 } } }}>
        <MenuItem dense onClick={startRename}>
          <ListItemIcon><DriveFileRenameOutlineIcon sx={{ fontSize: 15 }} /></ListItemIcon>
          <ListItemText slotProps={{ primary: { sx: { fontSize: '0.82rem' } } }}>
            {zh ? '重命名' : 'Rename'}
          </ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem dense onClick={() => { onDelete(); closeMenu() }} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon sx={{ fontSize: 15, color: 'error.main' }} /></ListItemIcon>
          <ListItemText slotProps={{ primary: { sx: { fontSize: '0.82rem' } } }}>
            {zh ? '删除文件夹' : 'Delete folder'}
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
