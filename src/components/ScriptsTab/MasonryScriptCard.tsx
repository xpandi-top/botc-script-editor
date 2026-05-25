import { useMemo, useState } from 'react'
import {
  Box, Chip, Divider, IconButton,
  ListItemIcon, ListItemText, Menu, MenuItem, Typography,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove'
import FolderIcon from '@mui/icons-material/Folder'
import FolderOffIcon from '@mui/icons-material/FolderOff'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { getIconForCharacter } from '../../catalog'
import { SCRIPT_TAG_META } from '../tabs/ScriptsTab.constants'
import type { EditableScript, Language, ScriptFolder } from '../../types'
import { useT } from '../../context/I18nContext'
import { makeTpl } from '../../lib/t'

// ── Per-slug deterministic dark gradient ───────────────────────────────────────

const OFFICIAL_BG: Record<string, string> = {
  tb:  'linear-gradient(160deg, #1a2744 0%, #1e3060 55%, #243a80 100%)',
  bmr: 'linear-gradient(160deg, #260d40 0%, #3d1570 55%, #521a9a 100%)',
  snv: 'linear-gradient(160deg, #0c2218 0%, #143a25 55%, #1e5535 100%)',
}
const FALLBACK_GRADIENTS = [
  'linear-gradient(160deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%)',
  'linear-gradient(160deg, #2d1b1b 0%, #4a2020 55%, #6b2828 100%)',
  'linear-gradient(160deg, #1a2d1a 0%, #1e3a1e 55%, #275c27 100%)',
  'linear-gradient(160deg, #2d1a2d 0%, #3d1f3d 55%, #522a52 100%)',
  'linear-gradient(160deg, #1a1f2d 0%, #1e2a3d 55%, #263a5c 100%)',
  'linear-gradient(160deg, #2d2a1a 0%, #3d381e 55%, #56502a 100%)',
  'linear-gradient(160deg, #1a2828 0%, #1e3535 55%, #265252 100%)',
]
function slugGradient(slug: string): string {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) & 0xffffffff
  return FALLBACK_GRADIENTS[Math.abs(h) % FALLBACK_GRADIENTS.length]
}

// ── Dynamic title font size ───────────────────────────────────────────────────

function titleFontSize(s: string): string {
  const n = s.length
  if (n <= 5)  return '2.1rem'
  if (n <= 8)  return '1.75rem'
  if (n <= 12) return '1.4rem'
  if (n <= 18) return '1.15rem'
  if (n <= 28) return '0.95rem'
  return '0.82rem'
}

// ── Character icon collage (background layer) ─────────────────────────────────

function CharCollage({ charIds, customIconMap }: {
  charIds: string[]
  customIconMap?: Map<string, string>
}) {
  const icons = charIds.slice(0, 18).map((id) => ({
    id,
    src: customIconMap?.get(id) ?? getIconForCharacter(id),
  })).filter(({ src }) => !!src)
  if (icons.length === 0) return null
  return (
    <Box sx={{
      position: 'absolute', inset: 0,
      display: 'flex', flexWrap: 'wrap',
      alignContent: 'flex-start', p: '10px', gap: '5px',
      overflow: 'hidden', pointerEvents: 'none',
    }}>
      {icons.map(({ id, src }) => (
        <Box key={id} component="img" src={src as string} alt="" sx={{
          width: 38, height: 38, borderRadius: '50%', objectFit: 'cover',
          flexShrink: 0, opacity: 0.25,
          filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))',
        }} />
      ))}
    </Box>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

type Props = {
  script: EditableScript
  isActive: boolean
  language: Language
  onSelect: () => void
  isDeletable?: boolean
  scriptFolders?: ScriptFolder[]
  onDelete?: () => void
  onDuplicate?: () => void
  onMoveToFolder?: (folderId: string | undefined) => void
}

export function MasonryScriptCard({
  script, isActive, language, onSelect,
  isDeletable = false,
  scriptFolders = [],
  onDelete,
  onDuplicate,
  onMoveToFolder,
}: Props) {
  const zh = language === 'zh'
  const { t } = useT()
  const tpl = makeTpl(language)
  const [imgErr, setImgErr] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [folderMenuAnchor, setFolderMenuAnchor] = useState<null | HTMLElement>(null)

  const title = (zh && script.titleZh) ? script.titleZh : script.title

  const customIconMap = useMemo(() => {
    if (!script.customCharacters.length) return undefined
    const map = new Map<string, string>()
    for (const c of script.customCharacters) {
      const img = Array.isArray(c.image) ? c.image[0] : c.image
      if (img) map.set(c.id, img)
    }
    return map.size > 0 ? map : undefined
  }, [script.customCharacters])

  const logo = script.meta?.logo
  const showLogo = !!logo && !imgErr
  const bgGradient = OFFICIAL_BG[script.slug] ?? slugGradient(script.slug)
  const tags = script.tags ?? []

  const hasActions = isDeletable || !!onDuplicate || !!onMoveToFolder
  const menuOpen = Boolean(menuAnchor)
  const showActions = hovered || menuOpen || Boolean(folderMenuAnchor)

  const openMenu = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    setMenuAnchor(e.currentTarget)
  }
  const closeMenu = () => { setMenuAnchor(null); setFolderMenuAnchor(null) }

  return (
    <>
      <Box
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect() }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          borderRadius: 2.5,
          overflow: 'hidden',
          cursor: 'pointer',
          userSelect: 'none',
          border: '2px solid',
          borderColor: isActive ? 'primary.main' : 'transparent',
          boxShadow: isActive
            ? '0 0 0 3px rgba(99,102,241,0.3), 0 4px 18px rgba(0,0,0,0.28)'
            : '0 2px 8px rgba(0,0,0,0.18)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: isActive
              ? '0 0 0 3px rgba(99,102,241,0.35), 0 10px 28px rgba(0,0,0,0.32)'
              : '0 8px 24px rgba(0,0,0,0.3)',
            borderColor: isActive ? 'primary.main' : 'primary.light',
          },
          '&:focus-visible': {
            outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 3,
          },
        }}
      >
        {/* ── Header: bg image or gradient + title ── */}
        <Box sx={{
          position: 'relative',
          height: 210,
          overflow: 'hidden',
          background: showLogo ? undefined : bgGradient,
        }}>
          {showLogo ? (
            <>
              <Box component="img" src={logo} alt=""
                onError={() => setImgErr(true)}
                sx={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover', display: 'block',
                }}
              />
              <Box sx={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.78) 100%)',
              }} />
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 1.5 }}>
                <Typography sx={{
                  color: 'rgba(255,255,255,0.97)', fontSize: titleFontSize(title),
                  fontWeight: 800, lineHeight: 1.2,
                  textShadow: '0 1px 6px rgba(0,0,0,0.8)',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {title}
                </Typography>
              </Box>
            </>
          ) : (
            <>
              <CharCollage charIds={script.characters} customIconMap={customIconMap} />
              <Box sx={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                p: 2.5,
              }}>
                <Typography sx={{
                  color: 'rgba(255,255,255,0.96)', fontSize: titleFontSize(title),
                  fontWeight: 800, lineHeight: 1.2, textAlign: 'center',
                  textShadow: '0 2px 10px rgba(0,0,0,0.55)',
                  letterSpacing: title.length < 8 ? '0.03em' : 0,
                  display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {title}
                </Typography>
              </Box>
            </>
          )}

          {/* ── Three-dot action button (on hover) ── */}
          {hasActions && (
            <Box sx={{
              position: 'absolute', top: 7, right: 7,
              opacity: showActions ? 1 : 0,
              transition: 'opacity 0.15s ease',
            }}>
              <IconButton
                size="small"
                onClick={openMenu}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.52)',
                  color: 'white',
                  width: 28, height: 28,
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
                }}
              >
                <MoreVertIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          )}
        </Box>

        {/* ── Footer: author, count, tags ── */}
        <Box sx={{
          px: 1.5, pt: 1, pb: 1.1,
          bgcolor: 'background.paper',
          display: 'flex', flexDirection: 'column', gap: 0.5,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            <Typography sx={{
              flex: 1, fontSize: '0.72rem', color: 'text.secondary',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {script.author || ' '}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
              {script.version && (
                <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', fontFamily: 'monospace' }}>
                  v{script.version}
                </Typography>
              )}
              {script.characters.length > 0 && (
                <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>
                  {tpl('script_chars_short', script.characters.length)}
                </Typography>
              )}
            </Box>
          </Box>
          {tags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap' }}>
              {tags.slice(0, 3).map((tag) => {
                const meta = SCRIPT_TAG_META[tag]
                const color = meta?.color ?? '#9e9e9e'
                return (
                  <Chip key={tag} label={meta ? (zh ? meta.zh : meta.en) : tag} size="small"
                    sx={{
                      height: 16, fontSize: '0.58rem', fontWeight: 600,
                      bgcolor: color + '22', color, border: `1px solid ${color}44`,
                      '& .MuiChip-label': { px: '5px' },
                    }} />
                )
              })}
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Action menu ── */}
      <Menu
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={closeMenu}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { sx: { minWidth: 170 } } }}
      >
        {/* Copy to DIY — available for any built-in script if duplicate fn exists */}
        {!isDeletable && onDuplicate && (
          <MenuItem dense onClick={() => { onDuplicate(); closeMenu() }}>
            <ListItemIcon><ContentCopyIcon sx={{ fontSize: 15 }} /></ListItemIcon>
            <ListItemText slotProps={{ primary: { sx: { fontSize: '0.82rem' } } }}>
              {t('copy_to_diy')}
            </ListItemText>
          </MenuItem>
        )}

        {/* Move to folder — available for any script (community or DIY) when onMoveToFolder provided */}
        {onMoveToFolder && (
          <>
            {/* Remove from folder */}
            {script.folderId && (
              <MenuItem dense onClick={() => { onMoveToFolder(undefined); closeMenu() }}>
                <ListItemIcon><FolderOffIcon sx={{ fontSize: 15 }} /></ListItemIcon>
                <ListItemText slotProps={{ primary: { sx: { fontSize: '0.82rem' } } }}>
                  {t('remove_from_folder')}
                </ListItemText>
              </MenuItem>
            )}
            {/* Move to specific folder */}
            {scriptFolders.filter((f) => f.id !== script.folderId).length > 0 && (
              <MenuItem dense onClick={(e) => setFolderMenuAnchor(e.currentTarget)}>
                <ListItemIcon><DriveFileMoveIcon sx={{ fontSize: 15 }} /></ListItemIcon>
                <ListItemText slotProps={{ primary: { sx: { fontSize: '0.82rem' } } }}>
                  {t('move_to_folder')}
                </ListItemText>
              </MenuItem>
            )}
          </>
        )}

        {/* Delete */}
        {isDeletable && onDelete && (
          <>
            <Divider />
            <MenuItem dense onClick={() => { onDelete(); closeMenu() }}
              sx={{ color: 'error.main' }}>
              <ListItemIcon><DeleteIcon sx={{ fontSize: 15, color: 'error.main' }} /></ListItemIcon>
              <ListItemText slotProps={{ primary: { sx: { fontSize: '0.82rem' } } }}>
                {t('delete')}
              </ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* ── Folder submenu ── */}
      <Menu
        anchorEl={folderMenuAnchor}
        open={Boolean(folderMenuAnchor)}
        onClose={() => setFolderMenuAnchor(null)}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { sx: { minWidth: 150 } } }}
      >
        {scriptFolders.filter((f) => f.id !== script.folderId).map((f) => (
          <MenuItem key={f.id} dense onClick={() => { onMoveToFolder?.(f.id); closeMenu() }}>
            <ListItemIcon><FolderIcon sx={{ fontSize: 15, color: 'warning.main' }} /></ListItemIcon>
            <ListItemText slotProps={{ primary: { sx: { fontSize: '0.82rem' } } }}>
              {f.name}
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
