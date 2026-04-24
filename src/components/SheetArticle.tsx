import { Box, Typography, Paper, Grid, IconButton, Chip } from '@mui/material'
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
}: SheetArticleProps) {
  const po = printOptions
  const iconSize        = po?.iconSize ?? 32
  const columns         = po?.columns ?? 2
  const fontFamilyEn   = po ? FONT_CSS[po.fontKeyEn] : undefined
  const fontFamilyZh   = po ? FONT_CSS[po.fontKeyZh] : undefined
  const fontSize        = po ? `${po.fontSize}pt` : undefined
  const titleFontSize   = po ? `${po.titleFontSize}pt` : undefined
  const sectionFontSize = po ? `${po.sectionFontSize}pt` : undefined
  const showSectionBg   = po ? po.showSectionBg : true
  const padDef          = po ? PADDING_MAP[po.padding] : null
  const cardPadding     = padDef ? `${padDef.card}px` : '8px'
  const gridSpacing     = padDef ? padDef.gridSpacing : 1
  const sectionMb       = padDef ? padDef.sectionMb : 2
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
    p: 2,
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

  const renderWakeOrder = (ids: string[], label: string) => (
    <Box sx={{ width: iconSize + 8, flexShrink: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25, display: 'block', fontSize: '0.65rem' }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {ids.map((id) => {
          const icon = getIconForCharacter(id)
          return icon ? (
            <Box component="img" key={id} src={icon} sx={{ width: iconSize, height: iconSize }} />
          ) : (
            <Box key={id} sx={{ width: iconSize, height: iconSize, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: bw ? 'grey.400' : 'grey.300', borderRadius: 0.5 }}>
              <Typography variant="caption">{getNightOrderPlaceholderLabel(id)}</Typography>
            </Box>
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

    return (
      <Grid key={character.id} size={{ xs: 12, sm: columns === 1 ? 12 : 6 }}>
        <Paper variant="outlined" sx={{ p: cardPadding, position: 'relative', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
            {icon ? (
              <Box component="img" src={icon} alt="" sx={{ width: iconSize, height: iconSize, objectFit: 'contain', flexShrink: 0 }} />
            ) : (
              <Box sx={{ width: iconSize, height: iconSize, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.200', borderRadius: 0.5 }}>
                <Typography variant="caption">{character.id.slice(0, 2).toUpperCase()}</Typography>
              </Box>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap sx={{ fontFamily: lang === 'zh' ? zhFont : enFont, lineHeight: 1.2 }}>
                {displayName}{nameAlt && nameAlt !== displayName ? ` / ${nameAlt}` : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary"
                sx={{ fontFamily: lang === 'zh' ? zhFont : enFont, lineHeight: 1.3 }}
                dangerouslySetInnerHTML={{ __html: ability }}
              />
              {abilityAlt && abilityAlt !== ability && (
                <Typography variant="body2" color="text.secondary"
                  sx={{ fontFamily: lang === 'zh' ? enFont : zhFont, lineHeight: 1.3, opacity: 0.8, mt: 0.1 }}
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
      {groupedScriptCharacters.map((group) => (
        <Box key={group.team} sx={{ mb: sectionMb, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
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
        {showWakeOrder && renderWakeOrder(firstNightOrder, lang === 'zh' ? '首夜' : 'First Night')}
        {renderCharacterList(lang, withBoth)}
        {showWakeOrder && renderWakeOrder(otherNightOrder, lang === 'zh' ? '非首夜' : 'Other Night')}
      </Box>
      {supplementalPlacement === 'end' ? renderSupplemental(lang) : null}
    </Box>
  )

  return (
    <Paper className={`${className ?? ''} ${sheetDensityClass ?? ''}`} sx={rootSx}>
      {isSeparate ? (
        <>
          {renderPage(language, false)}
          <Box sx={{ pageBreakBefore: 'always', breakBefore: 'page', mt: 4 }} />
          {renderPage(language === 'zh' ? 'en' : 'zh', false)}
        </>
      ) : (
        renderPage(language, isMixed)
      )}
    </Paper>
  )
}
