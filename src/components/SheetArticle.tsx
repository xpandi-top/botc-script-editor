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
  if (id === 'MINION_INFO') {
    return 'M'
  }
  if (id === 'DEMON_INFO') {
    return 'D'
  }
  return id.slice(0, 2).toUpperCase()
}

function normalizeNightOrderToken(id: string) {
  if (id === 'minioninfo') {
    return 'MINION_INFO'
  }
  if (id === 'demoninfo') {
    return 'DEMON_INFO'
  }
  return id
}

function getCharacterImage(character: ResolvedScriptCharacter) {
  if (typeof character.image === 'string') {
    return character.image
  }
  if (Array.isArray(character.image)) {
    return character.image[0]
  }
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
  const iconSize = po?.iconSize ?? 32
  const columns = po?.columns ?? 2
  const fontSize = po ? `${po.fontSize}pt` : undefined
  const fontFamily = po ? FONT_CSS[po.fontKey] : undefined
  const cardPadding = po ? `${PADDING_MAP[po.padding]}px` : undefined
  const bw = po?.blackAndWhite ?? false
  const bilingual = po?.bilingual ?? false
  const editionLabel =
    editionLabels[language][activeScript.edition] ?? toTitleCase(activeScript.edition)
  const sheetTitle = language === 'zh' ? activeScript.titleZh || activeScript.title : activeScript.title
  const scriptCharacterIds = new Set(activeScriptCharacters.map((character) => character.id))
  const customFirstNightOrder =
    activeScript.meta.firstNight?.map((id) => normalizeNightOrderToken(id)).filter((id) => id !== 'dusk' && id !== 'dawn') ??
    []
  const customOtherNightOrder =
    activeScript.meta.otherNight?.map((id) => normalizeNightOrderToken(id)).filter((id) => id !== 'dusk' && id !== 'dawn') ??
    []
  const firstNightSource = customFirstNightOrder.length > 0 ? customFirstNightOrder : nightOrder.first_night ?? []
  const otherNightSource = customOtherNightOrder.length > 0 ? customOtherNightOrder : nightOrder.other_nights ?? []
  const firstNightOrder = firstNightSource.filter(
    (id) => id === 'MINION_INFO' || id === 'DEMON_INFO' || scriptCharacterIds.has(id),
  )
  const otherNightOrder = otherNightSource.filter((id) => scriptCharacterIds.has(id))
  const englishBootleggerRules = activeScript.meta.bootlegger?.filter(Boolean) ?? []
  const chineseBootleggerRules = activeScript.meta.bootlegger_zh?.filter(Boolean) ?? []
  const bootleggerRules =
    language === 'zh'
      ? (chineseBootleggerRules.length > 0 ? chineseBootleggerRules : englishBootleggerRules)
      : englishBootleggerRules
  const scriptJinxes = getActiveJinxesForScript(
    activeScriptCharacters.map((character) => character.id),
    language,
    activeScript.meta.jinxes,
  )

  const renderSupplementalSection = () => {
    if (bootleggerRules.length === 0 && scriptJinxes.length === 0) {
      return null
    }

    return (
      <Box sx={{ mb: 2 }}>
        {bootleggerRules.length > 0 ? (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{bootleggerRulesLabel}</Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              {bootleggerRules.map((rule, index) => (
                <Typography component="li" variant="body2" key={`${index}-${rule}`}>{rule}</Typography>
              ))}
            </Box>
          </Box>
        ) : null}

        {scriptJinxes.length > 0 ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{jinxesLabel}</Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              {scriptJinxes.map((jinx) => (
                <Typography component="li" variant="body2" key={jinx.id}>
                  <strong>{jinx.names}:</strong> {jinx.reason}
                </Typography>
              ))}
            </Box>
          </Box>
        ) : null}
      </Box>
    )
  }

  return (
    <Paper
      className={`${className ?? ''} ${sheetDensityClass ?? ''}`}
      sx={{
        p: 2,
        ...(fontSize && { fontSize }),
        ...(fontFamily && { fontFamily }),
        ...(bw && { filter: 'grayscale(100%)' }),
        '& *': {
          ...(fontSize && { fontSize: 'inherit' }),
          ...(fontFamily && { fontFamily: 'inherit' }),
        },
      }}
    >
      <Box sx={{ mb: 2 }}>
        {showEdition && (
          <Typography variant="overline" color="text.secondary">{editionLabel}</Typography>
        )}
        <Typography variant="h5">{sheetTitle}</Typography>
        {showCharacterCount && (
          <Typography variant="body2" color="text.secondary">
            {activeScriptCharacters.length} {language === 'zh' ? '个角色' : 'characters'}
          </Typography>
        )}
      </Box>

      {supplementalPlacement === 'top' ? renderSupplementalSection() : null}

      <Box sx={{ display: 'flex', gap: 2 }}>
        {showWakeOrder && (
          <Box sx={{ width: iconSize + 8, flexShrink: 0, justifyContent: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              {language === 'zh' ? '首夜' : 'First Night'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flexDirection: 'column' }}>
              {firstNightOrder.map((id) => {
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
        )}

        <Box sx={{ flex: 1 }}>
          {groupedScriptCharacters.map((group) => (
            <Box key={group.team} sx={{ mb: 2 }}>
              <Chip
                label={teamLabels[language][group.team]}
                size="small"
                color={bw ? 'default' : ((group.team === 'townsfolk' || group.team === 'outsider') ? 'primary' : 'error')}
                sx={{ mb: 1, ...(bw && { bgcolor: 'grey.300', color: 'text.primary' }) }}
              />
              <Grid container spacing={1}>
                {group.characters.map((character) => {
                  const icon = getCharacterImage(character)
                  const displayName = character.name ?? getDisplayName(character.id, language)
                  const ability = character.ability ?? getAbilityText(character.id, language)
                  const abilityZh = bilingual ? (character.ability ?? getAbilityText(character.id, 'zh')) : null
                  const abilityEn = bilingual ? (character.ability ?? getAbilityText(character.id, 'en')) : null
                  const nameEn = bilingual ? getDisplayName(character.id, 'en') : null
                  const nameZh = bilingual ? getDisplayName(character.id, 'zh') : null

                  return (
                    <Grid key={character.id} size={{ xs: 12, sm: columns === 1 ? 12 : 6 }}>
                      <Paper variant="outlined" sx={{ p: cardPadding ?? 1, position: 'relative' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {icon ? (
                            <Box component="img" src={icon} alt="" sx={{ width: iconSize, height: iconSize, objectFit: 'contain', flexShrink: 0 }} />
                          ) : (
                            <Box sx={{ width: iconSize, height: iconSize, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.200', borderRadius: 0.5 }}>
                              <Typography variant="caption">{character.id.slice(0, 2).toUpperCase()}</Typography>
                            </Box>
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            {bilingual ? (
                              <Typography variant="subtitle2" noWrap>
                                {nameEn}{nameZh && nameZh !== nameEn ? ` / ${nameZh}` : ''}
                              </Typography>
                            ) : (
                              <Typography variant="subtitle2" noWrap>{displayName}</Typography>
                            )}
                            {bilingual ? (
                              <>
                                <Typography variant="body2" color="text.secondary" dangerouslySetInnerHTML={{ __html: abilityEn ?? '' }} />
                                {abilityZh && abilityZh !== abilityEn && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, opacity: 0.8 }} dangerouslySetInnerHTML={{ __html: abilityZh }} />
                                )}
                              </>
                            ) : (
                              <Typography variant="body2" color="text.secondary" dangerouslySetInnerHTML={{ __html: ability }} />
                            )}
                          </Box>
                        </Box>
                        {isEditMode && (
                          <IconButton
                            size="small"
                            aria-label={`Remove ${displayName}`}
                            onClick={() => onRemoveCharacter(character.id)}
                            sx={{ position: 'absolute', top: 2, right: 2 }}
                          >
                            ×
                          </IconButton>
                        )}
                      </Paper>
                    </Grid>
                  )
                })}
              </Grid>
            </Box>
          ))}
        </Box>

        {showWakeOrder && (
          <Box sx={{ width: iconSize + 8, flexShrink: 0, justifyContent: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              {language === 'zh' ? '非首夜' : 'Other Night'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flexDirection: 'column', }}>
              {otherNightOrder.map((id) => {
                const icon = getIconForCharacter(id)
                return icon ? (
                  <Box component="img" key={id} src={icon} sx={{ width: iconSize, height: iconSize }} />
                ) : (
                  <Box key={id} sx={{ width: iconSize, height: iconSize, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: bw ? 'grey.400' : 'grey.300', borderRadius: 0.5 }}>
                    <Typography variant="caption">{id.slice(0, 2).toUpperCase()}</Typography>
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}
      </Box>

      {supplementalPlacement === 'end' ? renderSupplementalSection() : null}
    </Paper>
  )
}