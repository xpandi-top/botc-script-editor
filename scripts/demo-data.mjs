// Fictional, deterministic showcase data. Never loaded by the production app.
const DEMO_PLAYERS = ['Alice','Bob','Carol','Dave','Eve','Frank','Grace','Hank','Iris','Jack']
const DEMO_CHARS   = ['washerwoman','librarian','investigator','chef','empath','fortuneteller','scarletwoman','monk','poisoner','imp']

function makeSeat(i, name, charId, alive = true) {
  return {
    seat: i + 1, name, alive, isTraveler: false, isExecuted: false,
    hasNoVote: false, customTags: [], stTags: [],
    characterId: charId, userCharacterId: null, teamTag: null, note: '',
  }
}
const DEMO_SEATS = DEMO_PLAYERS.map((name, i) => makeSeat(i, name, DEMO_CHARS[i], true))

export const DEMO_STATE = {
  activeScriptSlug: 'tb', activeScriptTitle: 'Trouble Brewing',
  gameId: 'demo-game-20260924', gameStartedAt: 1790208000000,
  selectedDayId: 'day-1',
  days: [{
    id: 'day-1', day: 1, phase: 'night', publicMode: 'free',
    nominationStep: 'waitingForNomination',
    privateSeconds: 300, publicFreeSeconds: 300, publicRoundRobinSeconds: 120,
    publicElapsedSeconds: 600, nominationWaitSeconds: 60,
    nominationActorSeconds: 60, nominationTargetSeconds: 60,
    currentSpeakerSeat: null, roundRobinSpokenSeats: [],
    seats: DEMO_SEATS,
    voteDraft: {
      actor: 1, target: 10, voters: [1, 2, 4, 6, 7],
      noVoters: [], note: '', manualPassed: null,
      nominationResult: 'succeed', isExile: false, voteCountOverride: null,
    },
    votingState: null,
    voteHistory: [{
      id: '1700000001000', actor: 3, target: 8,
      voters: [3, 5, 9], voteCount: 3, requiredVotes: 5,
      passed: false, note: '', overridden: false,
    }],
    skillHistory: [{
      id: '1700000000500', actor: 3, roleId: 'investigator',
      targets: [1, 7], targetNotes: {},
      statement: 'One of these is the Poisoner',
      note: '', result: 'success',
      activatedDuringPhase: 'night', visibility: 'st-only',
    }],
    eventLog: [
      { id: 'e1', timestamp: 1700000000000, phase: 'night',      kind: 'phaseTransition', detail: 'Night 1 began' },
      { id: 'e2', timestamp: 1700000000100, phase: 'private',    kind: 'phaseTransition', detail: 'Day 1 private chat' },
      { id: 'e3', timestamp: 1700000000200, phase: 'public',     kind: 'phaseTransition', detail: 'Day 1 public debate' },
      { id: 'e4', timestamp: 1700000000300, phase: 'night',      kind: 'tagChange',       detail: 'Investigator information recorded', visibility: 'st-only' },
    ],
    nightVisitedSeats: [3, 8, 10], gameEnded: false,
    demonBluffs: ['saint', 'virgin', 'soldier'],
  }],
  timerDefaults: {
    privateSeconds: 300, publicFreeSeconds: 300, publicRoundRobinSeconds: 120,
    nominationDelayMinutes: 0, nominationWaitSeconds: 60,
    nominationActorSeconds: 60, nominationTargetSeconds: 60,
    nominationVoteSeconds: 10, alarmSound: 'bell',
  },
  customTagPool: [], playerNamePool: DEMO_PLAYERS, gameRecords: [],
  stFabledIds: [], stCustomRules: '', stName: 'Demo ST', endGameResult: null,
}


DEMO_STATE.gameRecords = Array.from({ length: 12 }, (_, i) => ({
  id: `demo-record-${i}`, endedAt: 1790208000000 - i * 86400000,
  scriptSlug: 'tb', scriptTitle: 'Trouble Brewing',
  stName: 'Demo ST', winner: i % 3 === 0 ? 'evil' : 'good',
  balanced: 3 + i % 3, replay: 4 + i % 2, durationMs: (75 + i * 3) * 60000,
  days: structuredClone(DEMO_STATE.days),
}))
