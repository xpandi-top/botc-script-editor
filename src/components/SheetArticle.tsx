import { useState } from 'react'

/** Measure text width in px using an offscreen canvas. Falls back to char-count estimate. */
function measureTextPx(text: string, fontCss: string): number {
  try {
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) throw new Error()
    ctx.font = fontCss
    return ctx.measureText(text).width
  } catch {
    return text.length * 10
  }
}
import DOMPurify from 'dompurify'
import { Box, Typography, Paper, Grid, IconButton, Chip, Divider, Dialog, DialogTitle, DialogContent, Tooltip, useTheme } from '@mui/material'
import {
  editionLabels,
  getAbilityTextForScript,
  getDisplayName,
  getActiveJinxesForScript,
  getIconForCharacter,
  getEffectiveNightOrderFromRegistry,
  teamLabels,
  toTitleCase,
  locales,
} from '../catalog'
import type {
  EditableScript,
  Language,
  ResolvedScriptCharacter,
  ResolvedScriptCharacterGroup,
} from '../types'
import type { PrintOptions } from './PrintOptionsDialog'
import { PADDING_MAP, FONT_CSS } from './PrintOptionsDialog'
import { makeT } from '../lib/t'

// Restrict DOMPurify to inline formatting only — no hrefs, no event attrs
const PURIFY_OPTS: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'span'],
  ALLOWED_ATTR: [],
}

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
  hideAbility?: boolean
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
  hideAbility = false,
}: SheetArticleProps) {
  const [popupId, setPopupId] = useState<string | null>(null)
  const muiTheme = useTheme()
  const isDark = muiTheme.palette.mode === 'dark'
  const po = printOptions
  const iconSize        = po?.iconSize ?? 28
  const wakeIconSize    = po?.wakeIconSize ?? 24   // smaller default → more room for description
  const columns         = viewColumns ?? po?.columns ?? 2
  const fontFamilyEn   = po ? FONT_CSS[po.fontKeyEn] : undefined
  const fontFamilyZh   = po ? FONT_CSS[po.fontKeyZh] : undefined
  const fontSize        = po ? `${po.fontSize}pt` : undefined
  const nameFontSize     = po ? `${po.nameFontSize}pt` : undefined
  const titleFontSize   = po ? `${po.titleFontSize}pt` : undefined
  const sectionFontSize = po ? `${po.sectionFontSize}pt` : undefined
  // sectionStyle: new field takes precedence; fall back to legacy booleans
  const sectionStyle    = po?.sectionStyle ?? (po?.showSectionBg ? 'chip' : 'inline')
  const showIconCircle  = po ? po.showIconCircle : true
  const showCardOutline = po ? po.showCardOutline : false
  const wakeOrderMode   = po?.wakeOrder ?? (showWakeOrder ? 'side' : 'none')
  const titleAlign      = po?.titleAlign ?? 'left'
  const showAuthor      = po?.showAuthor ?? true
  const padDef          = po ? PADDING_MAP[po.padding] : null
  const cardPadding     = padDef ? `${Math.max(1, Math.floor(padDef.card / 2))}px ${Math.max(2, padDef.card)}px` : '2px 4px'
  const gridSpacing     = padDef ? padDef.gridSpacing : 0.5
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
  const effectiveNightOrder = getEffectiveNightOrderFromRegistry()
  const firstNightSource = customFirstNight.length > 0 ? customFirstNight : effectiveNightOrder.first_night ?? []
  const otherNightSource = customOtherNight.length > 0 ? customOtherNight : effectiveNightOrder.other_nights ?? []
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
  }

  const renderHeader = (lang: Language) => {
    const title = lang === 'zh' ? activeScript.titleZh || activeScript.title : activeScript.title
    const author = showAuthor && activeScript.author ? activeScript.author : null
    return (
      <Box sx={{ mb: 1, textAlign: titleAlign }}>
        {showEdition && (
          <Typography variant="overline" color="text.secondary">{editionLabel}</Typography>
        )}
        <Typography variant="h5" sx={{ ...(titleFontSize && { fontSize: titleFontSize }), fontFamily: lang === 'zh' ? fontFamilyZh : fontFamilyEn, lineHeight: 1.2 }}>
          {title}
          {author && (
            <Box component="span" sx={{
              fontWeight: 400,
              fontSize: titleFontSize ? `calc(${titleFontSize} * 0.6)` : '0.6em',
              opacity: 0.6,
              ml: '0.5em',
              verticalAlign: 'middle',
            }}>
              {makeT(lang)('author_prefix')}{author}
            </Box>
          )}
        </Typography>
        {showCharacterCount && (
          <Typography variant="body2" color="text.secondary" sx={{ ...(fontSize && { fontSize }) }}>
            {activeScriptCharacters.length} {makeT(lang)('characters_suffix')}
          </Typography>
        )}
      </Box>
    )
  }

  const renderSupplemental = (lang: Language) => {
    const rules = getBootleggerRules(lang)
    const jinxes = getScriptJinxes(lang)
    if (rules.length === 0 && jinxes.length === 0) return null
    // Derive labels from lang directly so bilingual-separate English page
    // shows English headers, not whatever uiLanguage the caller used for props.
    const blLabel = locales[lang].ui?.['bootlegger_rules'] ?? bootleggerRulesLabel
    const jLabel  = locales[lang].ui?.['jinxes']           ?? jinxesLabel
    return (
      <Box sx={{ mb: 1.5 }}>
        {rules.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, ...(fontSize && { fontSize }) }}>{blLabel}</Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              {rules.map((rule, i) => (
                <Typography component="li" variant="body2" key={i} sx={{ ...(fontSize && { fontSize }) }}>{rule}</Typography>
              ))}
            </Box>
          </Box>
        )}
        {jinxes.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5, ...(fontSize && { fontSize }) }}>{jLabel}</Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              {jinxes.map((jinx) => (
                <Typography component="li" variant="body2" key={jinx.id} sx={{ ...(fontSize && { fontSize }) }}>
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
              <Box sx={{ width: wakeIconSize, height: wakeIconSize, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: bw ? 'grey.400' : (isDark ? 'rgba(255,255,255,0.10)' : 'grey.300'), borderRadius: 0.5, cursor: 'pointer', '&:hover': { opacity: 0.75 } }}
                onClick={() => setPopupId(id)}>
                <Typography variant="caption" sx={{ fontSize: '0.5rem' }}>{getNightOrderPlaceholderLabel(id)}</Typography>
              </Box>
            </Tooltip>
          )
        })}
      </Box>
    </Box>
  )

  // nameColW = pixel width of widest character name across the whole script.
  // Passed in so every card in the list has identical column alignment.
  // Wake-order as numbered rows at bottom of page
  const renderWakeOrderBottom = (firstIds: string[], otherIds: string[], lang: Language) => {
    const zhFont = fontFamilyZh && fontFamilyZh !== fontFamilyEn ? fontFamilyZh : undefined
    const rowStyle = { display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' as const }
    const renderRow = (ids: string[], label: string) => ids.length === 0 ? null : (
      <Box sx={{ mb: 0.5 }}>
        <Typography sx={{ fontSize: sectionFontSize ?? '0.7rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.5px', color: 'text.secondary', mb: 0.25, fontFamily: lang === 'zh' ? zhFont : fontFamilyEn }}>
          {label}
        </Typography>
        <Box sx={rowStyle}>
          {ids.map((id, i) => {
            const icon = getIconForCharacter(id)
            const name = getDisplayName(id, lang)
            return (
              <Tooltip key={id} title={`${i + 1}. ${name}`} placement="top" arrow>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setPopupId(id)}>
                  {icon ? (
                    <Box component="img" src={icon} alt={name} sx={{ width: wakeIconSize, height: wakeIconSize, objectFit: 'contain' }} />
                  ) : (
                    <Box sx={{ width: wakeIconSize, height: wakeIconSize, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: isDark ? 'rgba(255,255,255,0.10)' : 'grey.300', borderRadius: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: '0.5rem' }}>{getNightOrderPlaceholderLabel(id)}</Typography>
                    </Box>
                  )}
                </Box>
              </Tooltip>
            )
          })}
        </Box>
      </Box>
    )
    return (
      <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        {renderRow(firstIds, makeT(lang)('sheet_first_night'))}
        {renderRow(otherIds, makeT(lang)('sheet_other_nights'))}
      </Box>
    )
  }

  const renderCharacterCard = (character: ResolvedScriptCharacter, lang: Language, withBoth: boolean, nameColW: number) => {
    const icon = getCharacterImage(character)
    // Always resolve name/ability from catalog/registry using render `lang`.
    // character.name / character.ability are pre-baked from uiLanguage in App.tsx,
    // which breaks bilingual-separate when uiLanguage ≠ render lang.
    // Fall back to stored values only for script-level custom chars not in any registry
    // (getDisplayName returns toTitleCase(id) and getAbilityText returns the fallback string).
    const NO_ABILITY = 'No ability text available.'

    // Prefer catalog (handles revisions); fall back to inline data on the character.
    // character.nameZh / character.abilityZh are populated for shared custom chars
    // that the recipient doesn't have in their local catalog.
    const catalogName = getDisplayName(character.id, lang)
    const inlineName  = lang === 'zh' ? (character.nameZh ?? character.name) : character.name
    const displayName = catalogName !== toTitleCase(character.id)
      ? catalogName
      : (inlineName ?? catalogName)

    const catalogAbility = getAbilityTextForScript(character.id, lang, activeScript.pinnedRevisions)
    const inlineAbility  = lang === 'zh' ? (character.abilityZh ?? character.ability) : character.ability
    const ability = catalogAbility !== NO_ABILITY
      ? catalogAbility
      : (inlineAbility ?? NO_ABILITY)

    const altLang = lang === 'zh' ? 'en' : 'zh'
    const abilityAlt = withBoth
      ? (() => {
          const a = getAbilityTextForScript(character.id, altLang, activeScript.pinnedRevisions)
          if (a !== NO_ABILITY) return a
          // Inline bilingual fallback for shared custom chars
          return altLang === 'zh'
            ? (character.abilityZh ?? character.ability ?? '')
            : (character.ability ?? '')
        })()
      : null
    const nameAltRaw = withBoth ? getDisplayName(character.id, altLang) : null
    const nameAlt = withBoth
      ? (nameAltRaw !== toTitleCase(character.id)
          ? nameAltRaw
          : (altLang === 'zh' ? (character.nameZh ?? character.name) : character.name) ?? nameAltRaw)
      : null

    const zhFont = fontFamilyZh && fontFamilyZh !== fontFamilyEn ? fontFamilyZh : undefined
    const enFont = fontFamilyEn

    return (
      <Grid key={character.id} size={{ xs: 12, sm: columns === 1 ? 12 : 6 }}>
        <Paper variant="outlined" sx={{
          p: cardPadding, position: 'relative', pageBreakInside: 'avoid', breakInside: 'avoid',
          ...(showCardOutline ? { borderWidth: 1, borderColor: 'divider' } : { borderWidth: 0 }),
        }}>
          <Box sx={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>

            {/* ── Col 1: Icon ── fixed to iconSize × iconSize */}
            <Box sx={{ width: iconSize, height: iconSize, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...(showIconCircle && { borderRadius: '50%', bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'grey.200' }) }}>
              {icon ? (
                <Box component="img" src={icon} alt="" sx={{ width: iconSize, height: iconSize, objectFit: 'contain' }} />
              ) : (
                <Typography variant="caption">{character.id.slice(0, 2).toUpperCase()}</Typography>
              )}
            </Box>

            {/* ── Col 2: Name ── grows to fill when ability hidden, otherwise fixed */}
            <Box sx={{ ...(hideAbility ? { flex: 1 } : { minWidth: nameColW, flexShrink: 0 }), display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: iconSize }}>
              <Typography sx={{
                fontFamily: lang === 'zh' ? zhFont : enFont,
                fontSize: nameFontSize, fontWeight: 600,
                lineHeight: 1.2, whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {displayName}
              </Typography>
              {nameAlt && nameAlt !== displayName && (
                <Typography sx={{
                  fontFamily: lang === 'zh' ? enFont : zhFont,
                  fontSize: nameFontSize ?? '8pt',
                  lineHeight: 1.2, whiteSpace: 'nowrap',
                  color: 'text.secondary',
                }}>
                  {nameAlt}
                </Typography>
              )}
            </Box>

            {/* ── Col 3: Description ── hidden when hideAbility=true */}
            {!hideAbility && (
              <Box sx={{ flex: 1, minWidth: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: iconSize }}>
                <Typography variant="body2"
                  sx={{ fontFamily: lang === 'zh' ? zhFont : enFont, lineHeight, mb: 0, color: 'text.primary', ...(fontSize && { fontSize }) }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ability, PURIFY_OPTS) }}
                />
                {abilityAlt && abilityAlt !== ability && (
                  <Typography variant="body2"
                    sx={{ fontFamily: lang === 'zh' ? enFont : zhFont, lineHeight, mt: 0.25, mb: 0, color: 'text.primary', ...(fontSize && { fontSize }) }}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(abilityAlt, PURIFY_OPTS) }}
                  />
                )}
              </Box>
            )}

          </Box>
          {isEditMode && (
            <IconButton size="small" aria-label={`Remove ${displayName}`}
              onClick={() => onRemoveCharacter(character.id)}
              sx={{ position: 'absolute', top: 2, right: 2 }}>×</IconButton>
          )}
        </Paper>
      </Grid>
    )
  }

  const renderCharacterList = (lang: Language, withBoth: boolean) => {
    // Compute name-column width = widest character name across the whole script.
    // For print: use explicit printOptions font. For web: read the actual resolved
    // CSS var (--font-en-body) so canvas uses the same font the browser renders.
    const allChars = groupedScriptCharacters.flatMap((g) => g.characters)
    const resolvedWebFont = (() => {
      try {
        const v = getComputedStyle(document.documentElement).getPropertyValue('--font-en-body').trim()
        return v || 'serif'
      } catch { return 'serif' }
    })()
    const nameFontSpec = po
      ? `600 ${nameFontSize} ${fontFamilyEn ?? 'sans-serif'}`
      : `600 1rem ${resolvedWebFont}`
    const maxNamePx = allChars.reduce((max, c) => {
      const primary = c.name ?? getDisplayName(c.id, lang)
      const alt = withBoth ? getDisplayName(c.id, lang === 'zh' ? 'en' : 'zh') : ''
      return Math.max(max, measureTextPx(primary, nameFontSpec), alt ? measureTextPx(alt, nameFontSpec) : 0)
    }, 0)
    // +12px buffer: accounts for font metric rounding and sub-pixel rendering
    const nameColW = Math.ceil(maxNamePx) + 12

    return (
      <Box sx={{ flex: 1 }}>
        {groupedScriptCharacters.map((group, idx) => (
          <Box key={group.team} sx={{ mb: sectionMb, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              {/* Section label — chip | line | inline */}
            {sectionStyle === 'chip' && (
              <Chip
                label={teamLabels[lang][group.team]}
                size="small"
                color={bw ? 'default' : ((group.team === 'townsfolk' || group.team === 'outsider') ? 'primary' : 'error')}
                sx={{ mb: 0.5, ...(bw && { bgcolor: 'grey.300', color: 'text.primary' }) }}
              />
            )}
            {sectionStyle === 'line' && (
              <>
                {idx > 0 && <Divider sx={{ mb: 0.5, borderBottomWidth: 1 }} />}
                <Typography sx={{ mb: 0.5, fontSize: sectionFontSize ?? '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
                  {teamLabels[lang][group.team]}
                </Typography>
              </>
            )}
            {sectionStyle === 'inline' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                {/* Use borderBottom not bgcolor — bgcolor is stripped in print */}
                <Box sx={{ flex: 1, height: 0, borderBottom: '1px solid', borderColor: 'text.secondary', opacity: 0.3 }} />
                <Typography sx={{ fontSize: sectionFontSize ?? '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {teamLabels[lang][group.team]}
                </Typography>
                <Box sx={{ flex: 1, height: 0, borderBottom: '1px solid', borderColor: 'text.secondary', opacity: 0.3 }} />
              </Box>
            )}
            <Grid container spacing={gridSpacing}>
              {group.characters.map((character) => renderCharacterCard(character, lang, withBoth, nameColW))}
            </Grid>
          </Box>
        ))}
      </Box>
    )
  }

  const renderPage = (lang: Language, withBoth: boolean) => (
    <Box>
      {renderHeader(lang)}
      {supplementalPlacement === 'top' ? renderSupplemental(lang) : null}
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        {wakeOrderMode === 'side' && renderWakeOrder(firstNightOrder)}
        {renderCharacterList(lang, withBoth)}
        {wakeOrderMode === 'side' && renderWakeOrder(otherNightOrder)}
      </Box>
      {wakeOrderMode === 'bottom' && renderWakeOrderBottom(firstNightOrder, otherNightOrder, lang)}
      {supplementalPlacement === 'end' ? renderSupplemental(lang) : null}
    </Box>
  )

  const popupChar = popupId ? activeScriptCharacters.find((c) => c.id === popupId) : null
  const popupName = popupId ? getDisplayName(popupId, language) : ''
  const popupNameAlt = popupId ? getDisplayName(popupId, 'zh') : ''
  const popupAbility = popupId ? getAbilityTextForScript(popupId, language, activeScript.pinnedRevisions) : ''
  const popupAbilityAlt = popupId ? getAbilityTextForScript(popupId, 'zh', activeScript.pinnedRevisions) : ''
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
