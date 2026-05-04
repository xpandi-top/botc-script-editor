import { useState } from 'react'
import { Box, Typography, Paper, Grid, IconButton, Chip, Divider, Dialog, DialogTitle, DialogContent, Tooltip } from '@mui/material'
import {
  editionLabels,
  getAbilityText,
  getDisplayName,
  getActiveJinxesForScript,
  getIconForCharacter,
  nightOrder,
  teamLabels,
  toTitleCase,
} from '../catalog'
import type {
  EditableScript,
  Language,
  ResolvedScriptCharacter,
  ResolvedScriptCharacterGroup,
} from '../types'
import type { PrintOptions } from './PrintOptionsDialog'
import { PADDING_MAP, FONT_CSS } from './PrintOptionsDialog'

type SheetArticleProps = {
  activeScript: EditableScript
  activeScriptCharacters: ResolvedScriptCharacter[]
  groupedScriptCharacters: ResolvedScriptCharacterGroup[]
  bootleggerRulesLabel: string
  jinxesLabel: string
  isEditMode: boolean
  onRemoveCharacter: (characterId: string) => void
  sheetDensityClass?: string
  language: Language
  className?: string
  showWakeOrder?: boolean
  showEdition?: boolean
  showCharacterCount?: boolean
  supplementalPlacement?: 'top' | 'end'
  printOptions?: PrintOptions
  viewColumns?: 1 | 2
}

function getNightOrderPlaceholderLabel(id: string) {
  if (id === 'MINION_INFO') return 'M'
  if (id === 'DEMON_INFO') return 'D'
  return id.slice(0, 2).toUpperCase()
}

function normalizeNightOrderToken(id: string) {
  if (id === 'minioninfo') return 'MINION_INFO'
  if (id === 'demoninfo') return 'DEMON_INFO'
  return id
}

function getCharacterImage(character: ResolvedScriptCharacter) {
  if (typeof character.image === 'string') return character.image
  if (Array.isArray(character.image)) return character.image[0]
  return getIconForCharacter(character.id)
}

export function SheetArticle({
  activeScript,
  activeScriptCharacters,
  groupedScriptCharacters,
  bootleggerRulesLabel,
  jinxesLabel,
  isEditMode,
  onRemoveCharacter,
  sheetDensityClass,
  language,
  className,
  showWakeOrder = true,
  showEdition = true,
  showCharacterCount = true,
  supplementalPlacement = 'top',
  printOptions,
  viewColumns,
}: SheetArticleProps) {
  const [popupId, setPopupId] = useState<string | null>(null)
  const po = printOptions
  const iconSize        = po?.iconSize ?? 32
  const wakeIconSize    = po?.wakeIconSize ?? 32
  const columns         = viewColumns ?? po?.columns ?? 2
  const fontFamilyEn   = po ? FONT_CSS[po.fontKeyEn] : undefined
  const fontFamilyZh   = po ? FONT_CSS[po.fontKeyZh] : undefined
  const fontSize        = po ? `${po.fontSize}pt` : undefined
  const nameFontSize     = po ? `${po.nameFontSize}pt` : undefined
  const titleFontSize   = po ? `${po.titleFontSize}pt` : undefined
  const sectionFontSize = po ? `${po.sectionFontSize}pt` : undefined
  const showSectionBg   = po ? po.showSectionBg : true
  const showSectionDivider = po ? po.showSectionDivider : false
  const showIconCircle  = po ? po.showIconCircle : true
  const showCardOutline = po ? po.showCardOutline : false
  const padDef          = po ? PADDING_MAP[po.padding] : null
  const cardPadding     = padDef ? `${padDef.card}px` : '8px'
  const gridSpacing     = padDef ? padDef.gridSpacing : 1
  const sectionMb       = padDef ? padDef.sectionMb : 2
  const outerPadding    = padDef ? `${padDef.outerPadding}px` : '16px'
  const lineHeight      = po?.lineHeight ?? 1.3
  const bw              = po?.blackAndWhite ?? false
  const langLayout      = po?.languageLayout ?? 'current'
  const isMixed         = langLayout === 'bilingual-mixed'
  const isSeparate      = langLayout === 'bilingual-separate'

  // Base font: use ZH font if current language is ZH and EN≠ZH, else EN font
  const baseFontFamily = (language === 'zh' && fontFamilyZh && fontFamilyZh !== fontFamilyEn)
    ? fontFamilyZh : fontFamilyEn

  const editionLabel = editionLabels[language][activeScript.edition] ?? toTitleCase(activeScript.edition)

  const scriptCharacterIds = new Set(activeScriptCharacters.map((c) => c.id))
  const customFirstNight = activeScript.meta.firstNight
    ?.map(normalizeNightOrderToken).filter((id) => id !== 'dusk' && id !== 'dawn') ?? []
  const customOtherNight = activeScript.meta.otherNight
    ?.map(normalizeNightOrderToken).filter((id) => id !== 'dusk' && id !== 'dawn') ?? []
  const firstNightSource = customFirstNight.length > 0 ? customFirstNight : nightOrder.first_night ?? []
  const otherNightSource = customOtherNight.length > 0 ? customOtherNight : nightOrder.other_nights ?? []
  const firstNightOrder = firstNightSource.filter(
    (id) => id === 'MINION_INFO' || id === 'DEMON_INFO' || scriptCharacterIds.has(id),
  )
  const otherNightOrder = otherNightSource.filter((id) => scriptCharacterIds.has(id))

  const englishBootleggerRules = activeScript.meta.bootlegger?.filter(Boolean) ?? []
  const chineseBootleggerRules = activeScript.meta.bootlegger_zh?.filter(Boolean) ?? []

  const getBootleggerRules = (lang: Language) =>
    lang === 'zh'
      ? (chineseBootleggerRules.length > 0 ? chineseBootleggerRules : englishBootleggerRules)
      : englishBootleggerRules

  const getScriptJinxes = (lang: Language) =>
    getActiveJinxesForScript(
      activeScriptCharacters.map((c) => c.id),
      lang,
      activeScript.meta.jinxes,
    )

  const rootSx = {
    p: outerPadding,
    ...(fontSize       && { fontSize }),
    ...(baseFontFamily && { fontFamily: baseFontFamily }),
    ...(bw             && { filter: 'grayscale(100%)' }),
    '& *': {
      ...(fontSize && { fontSize: 'inherit' }),
    },
  }

  const renderHeader = (lang: Language) => (
    <Box sx={{ mb: 1 }}>
      {showEdition && (
        <Typography variant="overline" color="text.secondary">{editionLabel}</Typography>
      )}
      <Typography variant="h5" sx={{ ...(titleFontSize && { fontSize: titleFontSize }), fontFamily: lang === 'zh' ? fontFamilyZh : fontFamilyEn }}>
        {lang === 'zh' ? activeScript.titleZh || activeScript.title : activeScript.title}
      </Typography>
      {showCharacterCount && (
        <Typography variant="body2" color="text.secondary">
          {activeScriptCharacters.length} {lang === 'zh' ? '个角色' : 'characters'}
        </Typography>
      )}
    </Box>
  )

  const renderSupplemental = (lang: Language) => {
    const rules = getBootleggerRules(lang)
    const jinxes = getScriptJinxes(lang)
    if (rules.length === 0 && jinxes.length === 0) return null
    return (
      <Box sx={{ mb: 1.5 }}>
        {rules.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{bootleggerRulesLabel}</Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              {rules.map((rule, i) => (
                <Typography component="li" variant="body2" key={i}>{rule}</Typography>
              ))}
            </Box>
          </Box>
        )}
        {jinxes.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{jinxesLabel}</Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              {jinxes.map((jinx) => (
                <Typography component="li" variant="body2" key={jinx.id}>
                  <strong>{jinx.names}:</strong> {jinx.reason}
                </Typography>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    )
  }

  const renderWakeOrder = (ids: string[]) => (
    <Box sx={{ width: wakeIconSize + 8, flexShrink: 0 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {ids.map((id) => {
          const icon = getIconForCharacter(id)
          const name = getDisplayName(id, language)
          return icon ? (
            <Tooltip key={id} title={name} placement="right" arrow>
              <Box component="img" src={icon}
                sx={{ width: wakeIconSize, height: wakeIconSize, cursor: 'pointer', borderRadius: 0.5, '&:hover': { opacity: 0.75, outline: '2px solid', outlineColor: 'primary.main' } }}
                onClick={() => setPopupId(id)}
              />
            </Tooltip>
          ) : (
            <Tooltip key={id} title={name} placement="right" arrow>
              <Box sx={{ width: wakeIconSize, height: wakeIconSize, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: bw ? 'grey.400' : 'grey.300', borderRadius: 0.5, cursor: 'pointer', '&:hover': { opacity: 0.75 } }}
                onClick={() => setPopupId(id)}>
                <Typography variant="caption" sx={{ fontSize: '0.5rem' }}>{getNightOrderPlaceholderLabel(id)}</Typography>
              </Box>
            </Tooltip>
          )
        })}
      </Box>
    </Box>
  )

  const renderCharacterCard = (character: ResolvedScriptCharacter, lang: Language, withBoth: boolean) => {
    const icon = getCharacterImage(character)
    const displayName = character.name ?? getDisplayName(character.id, lang)
    const ability = character.ability ?? getAbilityText(character.id, lang)
    const abilityAlt = withBoth
      ? (character.ability ?? getAbilityText(character.id, lang === 'zh' ? 'en' : 'zh'))
      : null
    const nameAlt = withBoth
      ? getDisplayName(character.id, lang === 'zh' ? 'en' : 'zh')
      : null

    const zhFont = fontFamilyZh && fontFamilyZh !== fontFamilyEn ? fontFamilyZh : undefined
    const enFont = fontFamilyEn

    // Left column width: icon + name stacked, fixed to icon size + a bit of padding
    const leftW = iconSize + 8

    return (
      <Grid key={character.id} size={{ xs: 12, sm: columns === 1 ? 12 : 6 }}>
        <Paper variant="outlined" sx={{ p: cardPadding, position: 'relative', pageBreakInside: 'avoid', breakInside: 'avoid',
          ...(showCardOutline ? { borderWidth: 1, borderColor: 'divider' } : { borderWidth: 0 }) }}>
          <Box sx={{ display: 'flex', gap: padDef ? `${padDef.card / 2}px` : '6px', alignItems: 'flex-start' }}>
            {/* Left: icon + name stacked */}
            <Box sx={{ width: leftW, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              {icon ? (
                <Box sx={{ width: iconSize, height: iconSize, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...(showIconCircle && { borderRadius: '50%', bgcolor: 'grey.200' }) }}>
                  <Box component="img" src={icon} alt="" sx={{ width: iconSize, height: iconSize, objectFit: 'contain' }} />
                </Box>
              ) : (
                <Box sx={{ width: iconSize, height: iconSize, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: 'grey.200', borderRadius: showIconCircle ? '50%' : 0.5 }}>
                  <Typography variant="caption">{character.id.slice(0, 2).toUpperCase()}</Typography>
                </Box>
              )}
              <Typography sx={{ fontFamily: lang === 'zh' ? zhFont : enFont, lineHeight, fontSize: nameFontSize,
                fontWeight: 600, textAlign: 'center', wordBreak: 'break-word', width: '100%' }}>
                {displayName}
              </Typography>
              {nameAlt && nameAlt !== displayName && (
                <Typography sx={{ fontFamily: lang === 'zh' ? enFont : zhFont, lineHeight, fontSize: nameFontSize ?? '8pt',
                  textAlign: 'center', color: 'text.secondary', wordBreak: 'break-word', width: '100%' }}>
                  {nameAlt}
                </Typography>
              )}
            </Box>
            {/* Right: description only */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" color="text.secondary"
                sx={{ fontFamily: lang === 'zh' ? zhFont : enFont, lineHeight, mb: 0 }}
                dangerouslySetInnerHTML={{ __html: ability }}
              />
              {abilityAlt && abilityAlt !== ability && (
                <Typography variant="body2" color="text.secondary"
                  sx={{ fontFamily: lang === 'zh' ? enFont : zhFont, lineHeight, opacity: 0.8, mt: 0.25, mb: 0 }}
                  dangerouslySetInnerHTML={{ __html: abilityAlt }}
                />
              )}
            </Box>
          </Box>
          {isEditMode && (
            <IconButton size="small" aria-label={`Remove ${displayName}`} onClick={() => onRemoveCharacter(character.id)} sx={{ position: 'absolute', top: 2, right: 2 }}>×</IconButton>
          )}
        </Paper>
      </Grid>
    )
  }

  const renderCharacterList = (lang: Language, withBoth: boolean) => (
    <Box sx={{ flex: 1 }}>
      {groupedScriptCharacters.map((group, idx) => (
        <Box key={group.team} sx={{ mb: sectionMb, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          {showSectionDivider && idx > 0 && (
            <Divider sx={{ mb: sectionMb, borderBottomWidth: 2 }} />
          )}
          {showSectionBg ? (
            <Chip
              label={teamLabels[lang][group.team]}
              size="small"
              color={bw ? 'default' : ((group.team === 'townsfolk' || group.team === 'outsider') ? 'primary' : 'error')}
              sx={{ mb: 0.5, ...(bw && { bgcolor: 'grey.300', color: 'text.primary' }) }}
            />
          ) : (
            <Typography sx={{ mb: 0.5, fontSize: sectionFontSize ?? '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
              {teamLabels[lang][group.team]}
            </Typography>
          )}
          <Grid container spacing={gridSpacing}>
            {group.characters.map((character) => renderCharacterCard(character, lang, withBoth))}
          </Grid>
        </Box>
      ))}
    </Box>
  )

  const renderPage = (lang: Language, withBoth: boolean) => (
    <Box>
      {renderHeader(lang)}
      {supplementalPlacement === 'top' ? renderSupplemental(lang) : null}
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        {showWakeOrder && renderWakeOrder(firstNightOrder)}
        {renderCharacterList(lang, withBoth)}
        {showWakeOrder && renderWakeOrder(otherNightOrder)}
      </Box>
      {supplementalPlacement === 'end' ? renderSupplemental(lang) : null}
    </Box>
  )

  const popupChar = popupId ? activeScriptCharacters.find((c) => c.id === popupId) : null
  const popupName = popupId ? getDisplayName(popupId, language) : ''
  const popupNameAlt = popupId ? getDisplayName(popupId, language === 'zh' ? 'en' : 'zh') : ''
  const popupAbility = popupId ? getAbilityText(popupId, language) : ''
  const popupAbilityAlt = popupId ? getAbilityText(popupId, language === 'zh' ? 'en' : 'zh') : ''
  const popupIcon = popupId ? getIconForCharacter(popupId) : null

  return (
    <>
      <Paper className={`sheet-root ${className ?? ''} ${sheetDensityClass ?? ''}`} sx={rootSx}>
        {isSeparate ? (
          <>
            {renderPage(language, false)}
            <Box sx={{ pageBreakBefore: 'always', breakBefore: 'page' }} />
            {renderPage(language === 'zh' ? 'en' : 'zh', false)}
          </>
        ) : (
          renderPage(language, isMixed)
        )}
      </Paper>

      <Dialog open={!!popupId} onClose={() => setPopupId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          {popupIcon && <Box component="img" src={popupIcon} sx={{ width: 40, height: 40 }} />}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {popupName}{popupNameAlt && popupNameAlt !== popupName ? ` · ${popupNameAlt}` : ''}
            </Typography>
            {popupChar && (
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                {popupChar.team}
              </Typography>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Typography variant="body2" sx={{ mb: popupAbilityAlt && popupAbilityAlt !== popupAbility ? 1 : 0 }}>
            {popupAbility}
          </Typography>
          {popupAbilityAlt && popupAbilityAlt !== popupAbility && (
            <Typography variant="body2" color="text.secondary">{popupAbilityAlt}</Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
