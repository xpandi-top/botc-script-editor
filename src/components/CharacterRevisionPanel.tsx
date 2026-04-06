import {
  getAbilityText,
  getCharacterRevisionIds,
  getCurrentRevision,
  getDisplayName,
  getIconForCharacter,
  getRevisionNote,
  getRevisionText,
} from '../catalog'
import type { CharacterEntry, Language } from '../types'

type CharacterRevisionPanelProps = {
  character?: CharacterEntry
  language: Language
  title: string
  currentRevisionLabel: string
  revisionHistoryLabel: string
  englishTextLabel: string
  chineseTextLabel: string
  revisionNoteLabel: string
  currentLabel: string
  noCharacterSelectedLabel: string
}

export function CharacterRevisionPanel({
  character,
  language,
  title,
  currentRevisionLabel,
  revisionHistoryLabel,
  englishTextLabel,
  chineseTextLabel,
  revisionNoteLabel,
  currentLabel,
  noCharacterSelectedLabel,
}: CharacterRevisionPanelProps) {
  if (!character) {
    return (
      <aside className="revision-panel">
        <h2>{title}</h2>
        <p className="revision-panel__empty">{noCharacterSelectedLabel}</p>
      </aside>
    )
  }

  const icon = getIconForCharacter(character.id)
  const revisionIds = getCharacterRevisionIds(character.id)
  const currentRevision = getCurrentRevision(character.id)
  const currentAbility = getAbilityText(character.id, language)

  return (
    <aside className="revision-panel">
      <div className="revision-panel__header">
        {icon ? (
          <img alt="" className="revision-panel__icon" src={icon} />
        ) : (
          <div className="revision-panel__icon revision-panel__icon--placeholder">
            {character.id.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <p className="revision-panel__eyebrow">{title}</p>
          <h2>{getDisplayName(character.id, language)}</h2>
          <p className="revision-panel__id">{character.id}</p>
        </div>
      </div>

      <section className="revision-panel__section">
        <div className="revision-panel__meta">
          <strong>{currentRevisionLabel}</strong>
          <span>{currentRevision}</span>
        </div>
        <p className="revision-panel__ability">{currentAbility}</p>
      </section>

      <section className="revision-panel__section">
        <h3>{revisionHistoryLabel}</h3>
        <div className="revision-history">
          {revisionIds.map((revision) => (
            <article className="revision-card" key={revision}>
              <div className="revision-card__header">
                <strong>{revision}</strong>
                {revision === currentRevision ? (
                  <span className="revision-card__badge">{currentLabel}</span>
                ) : null}
              </div>
              <div className="revision-card__copy">
                <p>
                  <strong>{revisionNoteLabel}</strong>
                </p>
                <p>{getRevisionNote(character.id, revision) || '-'}</p>
                <p>
                  <strong>{englishTextLabel}</strong>
                </p>
                <p>{getRevisionText(character.id, 'en', revision)}</p>
                <p>
                  <strong>{chineseTextLabel}</strong>
                </p>
                <p>{getRevisionText(character.id, 'zh', revision)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </aside>
  )
}
