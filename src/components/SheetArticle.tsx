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

type SheetArticleProps = {
  activeScript: EditableScript
  activeScriptCharacters: ResolvedScriptCharacter[]
  groupedScriptCharacters: ResolvedScriptCharacterGroup[]
  bootleggerRulesLabel: string
  jinxesLabel: string
  isEditMode: boolean
  onRemoveCharacter: (characterId: string) => void
  sheetDensityClass: string
  language: Language
  className?: string
  showWakeOrder?: boolean
  showEdition?: boolean
  showCharacterCount?: boolean
  supplementalPlacement?: 'top' | 'end'
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
}: SheetArticleProps) {
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

  function renderSupplementalSection() {
    if (bootleggerRules.length === 0 && scriptJinxes.length === 0) {
      return null
    }

    return (
      <section className="sheet__supplemental">
        {bootleggerRules.length > 0 ? (
          <section className="sheet__bootlegger">
            <h3>{bootleggerRulesLabel}</h3>
            <ul>
              {bootleggerRules.map((rule, index) => (
                <li key={`${index}-${rule}`}>{rule}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {scriptJinxes.length > 0 ? (
          <section className="sheet__jinxes">
            <h3>{jinxesLabel}</h3>
            <ul>
              {scriptJinxes.map((jinx) => (
                <li key={jinx.id}>
                  <strong>{jinx.names}:</strong> {jinx.reason}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
    )
  }

  return (
    <article
      className={['sheet', sheetDensityClass, className, `sheet--${language}`]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="sheet__header">
        {showEdition ? <p className="sheet__eyebrow">{editionLabel}</p> : null}
        <h2>{sheetTitle}</h2>
        {showCharacterCount ? (
          <p className="sheet__meta">
            {activeScriptCharacters.length} {language === 'zh' ? '个角色' : 'characters'}
          </p>
        ) : null}
      </header>

      {supplementalPlacement === 'top' ? renderSupplementalSection() : null}

      <div className={`sheet__body${showWakeOrder ? '' : ' sheet__body--no-night-order'}`}>
        {showWakeOrder ? (
          <aside className="night-order night-order--side night-order--left">
            <div className="night-order__row">
              <strong>{language === 'zh' ? '首夜' : 'First Night'}</strong>
              <div className="night-order__icons">
                {firstNightOrder.map((id) => {
                  const icon = getIconForCharacter(id)

                  return icon ? (
                    <img alt="" className="night-order__icon" key={id} src={icon} />
                  ) : (
                    <div className="night-order__icon night-order__icon--placeholder" key={id}>
                      {getNightOrderPlaceholderLabel(id)}
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>
        ) : null}

        <div className="sheet__groups">
          {groupedScriptCharacters.map((group) => (
            <section className="team-group" key={group.team}>
              <div className={`team-group__heading team-group__heading--${group.team}`}>
                <h3>{teamLabels[language][group.team]}</h3>
              </div>
              <div className="character-grid">
                {group.characters.map((character) => {
                  const icon = getCharacterImage(character)
                  const displayName = character.name ?? getDisplayName(character.id, language)
                  const ability = character.ability ?? getAbilityText(character.id, language)

                  return (
                    <article className="character-card" key={character.id}>
                      {icon ? (
                        <img alt="" className="character-card__icon" src={icon} />
                      ) : (
                        <div className="character-card__icon character-card__icon--placeholder">
                          {character.id.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="character-card__content">
                        <h4>{displayName}</h4>
                        <p
                          dangerouslySetInnerHTML={{
                            __html: ability,
                          }}
                        />
                        {isEditMode ? (
                          <button
                            aria-label={`Remove ${displayName}`}
                            className="remove-button"
                            onClick={() => onRemoveCharacter(character.id)}
                            type="button"
                          >
                            x
                          </button>
                        ) : null}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {showWakeOrder ? (
          <aside className="night-order night-order--side night-order--right">
            <div className="night-order__row">
              <strong>{language === 'zh' ? '非首夜' : 'Other Night'}</strong>
              <div className="night-order__icons">
                {otherNightOrder.map((id) => {
                  const icon = getIconForCharacter(id)

                  return icon ? (
                    <img alt="" className="night-order__icon" key={id} src={icon} />
                  ) : (
                    <div className="night-order__icon night-order__icon--placeholder" key={id}>
                      {id.slice(0, 2).toUpperCase()}
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      {supplementalPlacement === 'end' ? renderSupplementalSection() : null}
    </article>
  )
}
