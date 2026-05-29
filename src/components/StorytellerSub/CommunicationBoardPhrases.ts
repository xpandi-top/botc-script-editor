import type { Language } from '../../types'
import type { TplKey, UiKey } from '../../lib/t'

export type CommunicationPhraseTplKey = Extract<TplKey,
  | 'communication_phrase_char_in_play'
  | 'communication_phrase_char_not_in_play'
  | 'communication_phrase_choose_n_players'
  | 'communication_phrase_choose_n_chars'
  | 'communication_phrase_you_are_char'
  | 'communication_phrase_char_is_char'
>

type PlainPhraseTemplate = {
  key: string
  labelKey: UiKey
  kind: 'plain'
}
export type NumberPhraseTemplate = {
  key: string
  labelKey: CommunicationPhraseTplKey
  kind: 'number'
}
export type CharacterPhraseTemplate = {
  key: string
  labelKey: CommunicationPhraseTplKey
  kind: 'character'
}
export type MultiCharacterPhraseTemplate = {
  key: string
  labelKey: CommunicationPhraseTplKey
  kind: 'multi-character'
}
export type PhraseTemplate = PlainPhraseTemplate | NumberPhraseTemplate | CharacterPhraseTemplate | MultiCharacterPhraseTemplate

export const COMMUNICATION_PHRASES: PhraseTemplate[] = [
  { key: 'ability-tonight',  labelKey: 'communication_phrase_ability_tonight',  kind: 'plain' },
  { key: 'chat-tomorrow',    labelKey: 'communication_phrase_chat_tomorrow',    kind: 'plain' },
  { key: 'choose-ability',   labelKey: 'communication_phrase_choose_ability',   kind: 'plain' },
  { key: 'meet-minions',     labelKey: 'communication_phrase_meet_minions',     kind: 'plain' },
  { key: 'you-good',         labelKey: 'communication_phrase_you_good',         kind: 'plain' },
  { key: 'you-evil',         labelKey: 'communication_phrase_you_evil',         kind: 'plain' },
  { key: 'char-in-play',     labelKey: 'communication_phrase_char_in_play',     kind: 'multi-character' },
  { key: 'char-not-in-play', labelKey: 'communication_phrase_char_not_in_play', kind: 'multi-character' },
  { key: 'same-team',        labelKey: 'communication_phrase_same_team',        kind: 'plain' },
  { key: 'diff-team',        labelKey: 'communication_phrase_diff_team',        kind: 'plain' },
  { key: 'mistake',          labelKey: 'communication_phrase_mistake',          kind: 'plain' },
  { key: 'eyes-open',        labelKey: 'communication_phrase_eyes_open',        kind: 'plain' },
  { key: 'wake-up',          labelKey: 'communication_phrase_wake_up',          kind: 'plain' },
  { key: 'go-to-sleep',      labelKey: 'communication_phrase_go_to_sleep',      kind: 'plain' },
  { key: 'shake-head',       labelKey: 'communication_phrase_shake_head',       kind: 'plain' },
  { key: 'choose-n-players', labelKey: 'communication_phrase_choose_n_players', kind: 'number' },
  { key: 'choose-n-chars',   labelKey: 'communication_phrase_choose_n_chars',   kind: 'number' },
  { key: 'you-are-char',     labelKey: 'communication_phrase_you_are_char',     kind: 'character' },
  { key: 'char-is-char',     labelKey: 'communication_phrase_char_is_char',     kind: 'character' },
]

export function joinCharacterNames(names: string[], language: Language): string {
  if (names.length <= 2) return names.join(language === 'zh' ? '、' : ' and ')
  return names.slice(0, -1).join(language === 'zh' ? '、' : ', ') + (language === 'zh' ? '、' : ', and ') + names[names.length - 1]
}
