/**
 * useI18n — backward-compat hook for Storyteller components that use ctx.text.
 *
 * Returns the same TextDict shape as before, now derived from unified locale
 * files (assets/locales/*.json) via makeT so there is one source of truth.
 *
 * New code should use `useT()` from context/I18nContext instead.
 * Migrate ctx.text access gradually as components are updated.
 */

import { useMemo } from 'react'
import { makeT } from '../lib/t'
import type { Language } from '../types'

const LEGACY_TEXT_KEYS = [
  'eyebrow', 'title', 'playerCount', 'script', 'currentScript', 'controlConsole',
  'settings', 'gameActions', 'nightPhase', 'privateChat', 'publicChat', 'nomination',
  'freeSpeech', 'roundRobinMode', 'chooseSpeaker', 'randomSpeaker', 'nextSpeaker',
  'start', 'resetTimer', 'endNow', 'alarmSound', 'addTag', 'startNomination',
  'continuePublic', 'recordDone', 'clear', 'actor', 'target', 'voters', 'nonVoters',
  'requiredVotes', 'note', 'statement', 'skillActor', 'skillRole', 'skillTarget',
  'success', 'failure', 'result', 'aliveTag', 'executedTag', 'noVoteTag', 'traveler',
  'tagPool', 'clearUnusedTags', 'openSettings', 'closeSettings', 'selectedPlayer',
  'resetNames', 'restartGame', 'endGame', 'privateDefault', 'publicFreeDefault',
  'publicRoundRobinDefault', 'seatHint', 'voteTrail', 'skillTrail', 'sessionLog',
  'completedGames', 'noCompletedGames', 'systemOverridePass', 'systemOverrideFail',
  'clearOverride', 'pass', 'fail', 'confirm', 'cancel', 'restartTitle', 'endGameTitle',
  'voteTitle', 'waitingForNomination', 'actorSpeaking', 'targetSpeaking', 'readyToVote',
  'voting', 'votingDone', 'voteYes', 'startVoting', 'pickNominator', 'pickNominee',
  'useSkill', 'saveSkill', 'cancelSkill', 'targetNote', 'bgm', 'play', 'pause', 'loop',
  'eventLog', 'nominationGate', 'nominationAvailable', 'nominationDelayDefault',
  'nominationWaitDefault', 'actorSpeechDefault', 'targetSpeechDefault', 'voteDefault',
  'recordVote', 'currentVoter', 'nominationSucceed', 'nominationFailed', 'skipVoting',
  'continueNomination', 'phaseBeforePrivate', 'phaseDuringPrivate', 'phaseBeforePublic',
  'phaseDuringPublic', 'phaseDuringNomination', 'gameSection', 'daySection',
  'playerSection', 'bgmSection', 'newGame', 'saveBeforeNewGameTitle',
  'saveBeforeNewGameBody', 'saveAndNew', 'discardAndNew', 'startNewGame', 'confirmEnd',
  'distribution', 'townsfolk', 'outsider', 'minion', 'demon', 'randomAssign',
  'showAssign', 'hideAssign', 'winner', 'evil', 'good', 'playerTeam', 'playerNotes',
  'reviewModeLabel', 'editMode', 'addTraveler', 'playerPool', 'loadFakeNames',
  'assignName', 'singleLoop', 'loopAll', 'aggregatedLog', 'filterVote', 'filterSkill',
  'filterEvent', 'allDays', 'sortAsc', 'sortDesc', 'exportJson', 'importGame',
  'cancelNewGame', 'showLog', 'hideLog', 'showPanel', 'hidePanel', 'aliveCount',
  'totalCount', 'highestVote', 'leadingCandidate', 'todayNominators', 'todayNominees',
  'quickNomination', 'quickSkill', 'nextDay', 'seatAssignment', 'unassigned',
  'clickToAssign', 'loadLocalFile', 'removeFromSeat', 'editPlayers', 'loadPreset',
  'tagSettings', 'defaultTags', 'loadPredefinedTags', 'addTagLabel', 'travelersCount',
  'loadCustomAlarm', 'shareLog', 'shareLogCopied', 'quickAddLog', 'gameLogTitle',
] as const

const LEGACY_KEY_ALIASES: Partial<Record<TranslationKey, Parameters<ReturnType<typeof makeT>>[0]>> = {
  nightPhase: 'phase_night',
  privateChat: 'phase_private',
  publicChat: 'phase_public',
  nomination: 'phase_nomination',
  filterSkill: 'filter_ability',
  quickSkill: 'quick_ability',
  skillActor: 'ability_user',
  skillTarget: 'ability_target',
  skillTrail: 'ability_log',
  useSkill: 'use_ability',
  phaseBeforePrivate: 'phase_private_before',
  phaseDuringPrivate: 'phase_private_during',
  phaseBeforePublic: 'phase_public_before',
  phaseDuringPublic: 'phase_public_during',
  phaseDuringNomination: 'phase_nomination_during',
}

export type TranslationKey = typeof LEGACY_TEXT_KEYS[number]
export type TextDict = Record<TranslationKey, string>

function camelToSnake(s: string): string {
  return s.replace(/([A-Z])/g, (c) => `_${c.toLowerCase()}`)
}

export function useI18n(language: Language): TextDict {
  return useMemo(() => {
    const t = makeT(language)
    const dict: Record<string, string> = {}

    for (const key of LEGACY_TEXT_KEYS) {
      const localeKey = LEGACY_KEY_ALIASES[key] ?? camelToSnake(key)
      dict[key] = t(localeKey as Parameters<typeof t>[0])
    }

    return dict as TextDict
  }, [language])
}
