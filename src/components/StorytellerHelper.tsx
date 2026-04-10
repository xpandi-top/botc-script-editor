import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { characterById, getDisplayName, getIconForCharacter } from '../catalog'
import type { Language, Team } from '../types'

// ── Types ──────────────────────────────────────────────────────

type Phase = 'private' | 'public' | 'nomination'
type PublicMode = 'free' | 'roundRobin'
type NominationStep =
  | 'waitingForNomination'
  | 'nominationDecision'
  | 'actorSpeech'
  | 'targetSpeech'
  | 'readyToVote'
  | 'voting'
  | 'votingDone'

type PickerMode =
  | 'none'
  | 'speaker'
  | 'nominator'
  | 'nominee'
  | 'skillActor'
  | 'skillTarget'

type LoopMode = 'single' | 'all'

type CharacterAssignment = { seat: number; characterId: string; team: string }

type NewGameConfig = {
  playerCount: number
  scriptSlug: string
  randomAssign: boolean
  assignments: CharacterAssignment[]
  showAssignments: boolean
  seatNames: Record<number, string>
}

type EndGameResult = {
  winner: 'evil' | 'good' | null
  playerNotes: Record<number, string>
  playerTeams: Record<number, string>
}

type LogFilterState = {
  types: Set<string>
  dayFilter: number | 'all'
  sortAsc: boolean
}

type AggregatedLogEntry = {
  id: string
  day: number
  timestamp: number
  type: 'vote' | 'skill' | 'event'
  detail: string
}

type ConsoleSection = 'game' | 'day' | 'player' | 'bgm'

type ScriptOption = { slug: string; title: string; characters: string[] }

type StorytellerSeat = {
  seat: number
  name: string
  alive: boolean
  isTraveler: boolean
  isExecuted: boolean
  hasNoVote: boolean
  customTags: string[]
}

type VoteDraft = {
  actor: number | null
  target: number | null
  voters: number[]
  note: string
  manualPassed: boolean | null
}

type VoteRecord = {
  id: string
  actor: number
  target: number
  voters: number[]
  voteCount: number
  requiredVotes: number
  passed: boolean
  note: string
  overridden: boolean
}

type SkillDraft = {
  actor: number | null
  roleId: string
  targets: number[]
  targetNotes: Record<number, string>
  statement: string
  note: string
  result: 'success' | 'failure' | null
}

type SkillRecord = SkillDraft & { id: string; activatedDuringPhase: string }

type VotingState = {
  votingOrder: number[]
  votingIndex: number
  perPlayerSeconds: number
  votes: Record<number, boolean>
}

type SkillOverlayState = {
  pausedPhase: Phase
  wasTimerRunning: boolean
  draft: SkillDraft
  phaseContext: string
}

type EventLogEntry = {
  id: string
  timestamp: number
  phase: string
  kind: 'vote' | 'skill' | 'stateChange' | 'tagChange' | 'phaseTransition'
  detail: string
}

type AudioTrack = { name: string; src: string }

type TimerDefaults = {
  privateSeconds: number
  publicFreeSeconds: number
  publicRoundRobinSeconds: number
  nominationDelayMinutes: number
  nominationWaitSeconds: number
  nominationActorSeconds: number
  nominationTargetSeconds: number
  nominationVoteSeconds: number
}

type DayState = {
  id: string
  day: number
  phase: Phase
  publicMode: PublicMode
  nominationStep: NominationStep
  privateSeconds: number
  publicFreeSeconds: number
  publicRoundRobinSeconds: number
  publicElapsedSeconds: number
  nominationWaitSeconds: number
  nominationActorSeconds: number
  nominationTargetSeconds: number
  currentSpeakerSeat: number | null
  roundRobinSpokenSeats: number[]
  seats: StorytellerSeat[]
  voteDraft: VoteDraft
  votingState: VotingState | null
  voteHistory: VoteRecord[]
  skillHistory: SkillRecord[]
  eventLog: EventLogEntry[]
}

type GameRecord = {
  id: string
  endedAt: number
  scriptTitle?: string
  scriptSlug?: string
  winner?: 'evil' | 'good' | null
  playerSummaries?: Array<{ seat: number; name: string; team: string; notes: string }>
  days: Array<{ day: number; votes: number; skills: number }>
}

type PersistedState = {
  selectedDayId: string
  timerDefaults: TimerDefaults
  days: DayState[]
  customTagPool: string[]
  gameRecords: GameRecord[]
  playerNamePool: string[]
}

type DialogState =
  | { kind: 'voteResult'; nextValue: boolean | null; systemValue: boolean }
  | { kind: 'restartGame' }
  | { kind: 'endGame' }
  | null

type StorytellerHelperProps = {
  activeScriptSlug?: string
  activeScriptTitle?: string
  language: Language
  onSelectScript?: (slug: string) => void
  scriptOptions: ScriptOption[]
}

// ── Constants & Factories ──────────────────────────────────────

const STORAGE_KEY = 'botc-storyteller-companion-v5'
const DEFAULT_PLAYER_COUNT = 10
const BASE_URL = import.meta.env.BASE_URL ?? '/'

const CHARACTER_DISTRIBUTION: Record<number, { townsfolk: number; outsider: number; minion: number; demon: number }> = {
  5: { townsfolk: 3, outsider: 0, minion: 1, demon: 1 },
  6: { townsfolk: 3, outsider: 1, minion: 1, demon: 1 },
  7: { townsfolk: 5, outsider: 0, minion: 1, demon: 1 },
  8: { townsfolk: 5, outsider: 1, minion: 1, demon: 1 },
  9: { townsfolk: 5, outsider: 2, minion: 1, demon: 1 },
  10: { townsfolk: 7, outsider: 0, minion: 2, demon: 1 },
  11: { townsfolk: 7, outsider: 1, minion: 2, demon: 1 },
  12: { townsfolk: 7, outsider: 2, minion: 2, demon: 1 },
  13: { townsfolk: 9, outsider: 0, minion: 3, demon: 1 },
  14: { townsfolk: 9, outsider: 1, minion: 3, demon: 1 },
  15: { townsfolk: 9, outsider: 2, minion: 3, demon: 1 },
}

const FAKE_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack', 'Kate', 'Leo', 'Mia', 'Nick', 'Olive']
const FAKE_NAMES_ZH = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十', '冯十一', '陈十二', '褚十三', '卫十四', '蒋十五']

const AUDIO_TRACKS: AudioTrack[] = [
  { name: 'Blood on the Clocktower', src: `${BASE_URL}audio/botc.mp3` },
  { name: 'Below the Granite Arch', src: `${BASE_URL}audio/below_the_granite_arch.mp3` },
  { name: 'Measured Pulse of the Tower', src: `${BASE_URL}audio/measured_pulse_of_the_tower.mp3` },
  { name: 'Second Hand Stutter', src: `${BASE_URL}audio/second_hand_stutter.mp3` },
  { name: 'The Unwound Spring', src: `${BASE_URL}audio/the_unwound_spring.mp3` },
]

function createSeats(count: number): StorytellerSeat[] {
  return Array.from({ length: count }, (_, i) => ({
    seat: i + 1,
    name: `Player ${i + 1}`,
    alive: true,
    isTraveler: false,
    isExecuted: false,
    hasNoVote: false,
    customTags: [],
  }))
}

function createDefaultVoteDraft(): VoteDraft {
  return { actor: null, target: null, voters: [], note: '', manualPassed: null }
}

function createDefaultSkillDraft(): SkillDraft {
  return { actor: null, roleId: '', targets: [], targetNotes: {}, statement: '', note: '', result: null }
}

function createTimerDefaults(): TimerDefaults {
  return {
    privateSeconds: 180,
    publicFreeSeconds: 300,
    publicRoundRobinSeconds: 30,
    nominationDelayMinutes: 2,
    nominationWaitSeconds: 10,
    nominationActorSeconds: 30,
    nominationTargetSeconds: 30,
    nominationVoteSeconds: 5,
  }
}

function cloneSeats(seats: StorytellerSeat[]) {
  return seats.map((s) => ({ ...s, customTags: [...s.customTags] }))
}

function createDayState(day: number, seats: StorytellerSeat[], defaults: TimerDefaults): DayState {
  return {
    id: `day-${day}-${Math.random().toString(36).slice(2, 8)}`,
    day,
    phase: 'private',
    publicMode: 'free',
    nominationStep: 'waitingForNomination',
    privateSeconds: defaults.privateSeconds,
    publicFreeSeconds: defaults.publicFreeSeconds,
    publicRoundRobinSeconds: defaults.publicRoundRobinSeconds,
    publicElapsedSeconds: 0,
    nominationWaitSeconds: defaults.nominationWaitSeconds,
    nominationActorSeconds: defaults.nominationActorSeconds,
    nominationTargetSeconds: defaults.nominationTargetSeconds,
    currentSpeakerSeat: 1,
    roundRobinSpokenSeats: [],
    seats: cloneSeats(seats),
    voteDraft: createDefaultVoteDraft(),
    votingState: null,
    voteHistory: [],
    skillHistory: [],
    eventLog: [],
  }
}

function unique(values: number[]) {
  return Array.from(new Set(values)).sort((a, b) => a - b)
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function getNextRoundRobinSeat(seats: StorytellerSeat[], fromSeat: number | null, spokenSeats: number[]) {
  const remaining = seats.filter((s) => !spokenSeats.includes(s.seat)).map((s) => s.seat)
  if (!remaining.length) return null
  if (fromSeat === null) return remaining[0] ?? null
  const clockwise = [...remaining.filter((s) => s > fromSeat), ...remaining.filter((s) => s < fromSeat)]
  return clockwise[0] ?? null
}

function buildVotingOrder(seats: StorytellerSeat[], targetSeat: number): number[] {
  const eligible = seats.filter((s) => !s.hasNoVote).map((s) => s.seat)
  const idx = eligible.indexOf(targetSeat)
  if (idx === -1) return eligible
  return [...eligible.slice(idx + 1), ...eligible.slice(0, idx + 1)]
}

function makeEventId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ── Load / Migrate ─────────────────────────────────────────────

function loadInitialState(): PersistedState {
  const defaults = createTimerDefaults()
  const firstDay = createDayState(1, createSeats(DEFAULT_PLAYER_COUNT), defaults)
  const fallback: PersistedState = {
    selectedDayId: firstDay.id,
    timerDefaults: defaults,
    days: [firstDay],
    customTagPool: ['流放'],
    gameRecords: [],
    playerNamePool: [],
  }
  if (typeof window === 'undefined') return fallback
  const stored =
    window.localStorage.getItem(STORAGE_KEY) ??
    window.localStorage.getItem('botc-storyteller-companion-v4') ??
    window.localStorage.getItem('botc-storyteller-companion-v3')
  if (!stored) return fallback
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = JSON.parse(stored) as any
    if (!p.days?.length) return fallback
    return {
      selectedDayId: p.selectedDayId ?? p.days[0].id ?? fallback.selectedDayId,
      timerDefaults: {
        ...defaults,
        ...p.timerDefaults,
        nominationDelayMinutes: p.timerDefaults?.nominationDelayMinutes ?? 2,
        nominationWaitSeconds: p.timerDefaults?.nominationWaitSeconds ?? 10,
        nominationVoteSeconds: p.timerDefaults?.nominationVoteSeconds ?? 5,
      },
      customTagPool: p.customTagPool ?? [],
      playerNamePool: p.playerNamePool ?? [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      days: p.days.map((d: any, i: number) => ({
        id: d.id ?? `day-${i + 1}`,
        day: d.day ?? i + 1,
        phase: d.phase === 'skill' ? 'public' : (d.phase ?? 'private'),
        publicMode: d.publicMode ?? 'free',
        nominationStep: d.nominationStep ?? 'waitingForNomination',
        privateSeconds: d.privateSeconds ?? defaults.privateSeconds,
        publicFreeSeconds: d.publicFreeSeconds ?? defaults.publicFreeSeconds,
        publicRoundRobinSeconds: d.publicRoundRobinSeconds ?? defaults.publicRoundRobinSeconds,
        publicElapsedSeconds: d.publicElapsedSeconds ?? 0,
        nominationWaitSeconds: d.nominationWaitSeconds ?? defaults.nominationWaitSeconds,
        nominationActorSeconds: d.nominationActorSeconds ?? defaults.nominationActorSeconds,
        nominationTargetSeconds: d.nominationTargetSeconds ?? defaults.nominationTargetSeconds,
        currentSpeakerSeat: d.currentSpeakerSeat ?? 1,
        roundRobinSpokenSeats: d.roundRobinSpokenSeats ?? [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        seats: d.seats?.map((s: any, si: number) => ({
          seat: s.seat ?? si + 1,
          name: s.name ?? `Player ${si + 1}`,
          alive: s.alive ?? true,
          isTraveler: s.isTraveler ?? false,
          isExecuted: s.isExecuted ?? false,
          hasNoVote: s.hasNoVote ?? false,
          customTags: s.customTags ?? [],
        })) ?? createSeats(DEFAULT_PLAYER_COUNT),
        voteDraft: { ...createDefaultVoteDraft(), ...d.voteDraft },
        votingState: d.votingState ?? null,
        voteHistory: d.voteHistory ?? [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        skillHistory: (d.skillHistory ?? []).map((s: any) => ({
          ...createDefaultSkillDraft(),
          ...s,
          targetNotes: s.targetNotes ?? {},
          activatedDuringPhase: s.activatedDuringPhase ?? '',
        })),
        eventLog: d.eventLog ?? [],
      })),
      gameRecords: p.gameRecords ?? [],
    }
  } catch {
    return fallback
  }
}

// ── Component ──────────────────────────────────────────────────

export function StorytellerHelper({
  activeScriptSlug,
  activeScriptTitle,
  language,
  onSelectScript,
  scriptOptions,
}: StorytellerHelperProps) {
  // ── State ──
  const initial = useMemo(() => loadInitialState(), [])
  const [days, setDays] = useState(initial.days)
  const [selectedDayId, setSelectedDayId] = useState(initial.selectedDayId)
  const [timerDefaults, setTimerDefaults] = useState(initial.timerDefaults)
  const [customTagPool, setCustomTagPool] = useState(initial.customTagPool)
  const [gameRecords, setGameRecords] = useState(initial.gameRecords)
  const [playerNamePool, setPlayerNamePool] = useState<string[]>(initial.playerNamePool)
  const [pickerMode, setPickerMode] = useState<PickerMode>('none')
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [dialogState, setDialogState] = useState<DialogState>(null)
  const [seatTagDrafts, setSeatTagDrafts] = useState<Record<number, string>>({})
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showLogPanel, setShowLogPanel] = useState(false)
  const [skillOverlay, setSkillOverlay] = useState<SkillOverlayState | null>(null)
  const [audioTrackIndex, setAudioTrackIndex] = useState(0)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioLoopMode, setAudioLoopMode] = useState<LoopMode>('all')
  const [newGamePanel, setNewGamePanel] = useState<NewGameConfig | null>(null)
  const [endGameResult, setEndGameResult] = useState<EndGameResult | null>(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [logFilter, setLogFilter] = useState<LogFilterState>({ types: new Set(['vote', 'skill', 'event']), dayFilter: 'all', sortAsc: false })
  const [activeConsoleSection, setActiveConsoleSection] = useState<ConsoleSection | null>('day')
  const lastCountdownRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // ── i18n ──
  const text = useMemo(
    () =>
      language === 'zh'
        ? {
            eyebrow: '说书人工作台',
            title: 'Storyteller Companion',
            playerCount: '玩家人数',
            script: '剧本',
            currentScript: '当前 Script',
            controlConsole: '控制台',
            settings: '设置',
            gameActions: '操作',
            privateChat: '私聊',
            publicChat: '公聊',
            nomination: '提名',
            freeSpeech: '自由发言',
            roundRobinMode: '轮流发言',
            chooseSpeaker: '指定首位',
            randomSpeaker: '随机首位',
            nextSpeaker: '下一位',
            start: '开始/暂停',
            resetTimer: '恢复默认',
            endNow: '结束',
            addTag: '加标签',
            startNomination: '进入提名',
            continuePublic: '继续公聊',
            recordDone: '记录完成',
            clear: '清空',
            actor: '提名者',
            target: '被提名者',
            voters: '赞同票',
            nonVoters: '未投票',
            requiredVotes: '过票门槛',
            note: '备注',
            statement: '声明',
            skillActor: '技能发动者',
            skillRole: '声明技能角色',
            skillTarget: '技能目标',
            success: '成功',
            failure: '失败',
            result: '结果',
            aliveTag: '死亡',
            executedTag: '处决',
            noVoteTag: '无投票权',
            traveler: '旅人',
            tagPool: '标签池',
            clearUnusedTags: '清空未使用标签',
            openSettings: '设置',
            closeSettings: '收起设置',
            selectedPlayer: '当前玩家',
            resetNames: '重置姓名',
            restartGame: '重开一局',
            endGame: '结束本局',
            privateDefault: '私聊默认时间',
            publicFreeDefault: '公聊-自由时间',
            publicRoundRobinDefault: '公聊-轮流/人',
            seatHint: '点击座位选择发言者、提名者、被提名者或技能目标。',
            voteTrail: '投票轨迹',
            skillTrail: '技能记录',
            sessionLog: '本局记录',
            completedGames: '已结束对局',
            noCompletedGames: '还没有已结束的对局。',
            systemOverridePass: 'Override 通过',
            systemOverrideFail: 'Override 失败',
            clearOverride: '清除 Override',
            pass: '通过',
            fail: '未通过',
            confirm: '确认',
            cancel: '取消',
            restartTitle: '确认重开一局？',
            endGameTitle: '确认结束本局？',
            voteTitle: '确认覆盖投票结果？',
            waitingForNomination: '等待提名...',
            actorSpeaking: '提名者发言',
            targetSpeaking: '被提名者发言',
            readyToVote: '准备投票',
            voting: '投票中',
            votingDone: '投票完成',
            voteYes: '赞同',
            startVoting: '开始投票',
            pickNominator: '选择提名者',
            pickNominee: '选择被提名者',
            useSkill: '发动技能',
            saveSkill: '保存',
            cancelSkill: '取消',
            targetNote: '目标备注',
            bgm: '背景音乐',
            play: '播放',
            pause: '暂停',
            loop: '循环',
            eventLog: '事件记录',
            nominationGate: '距提名开放',
            nominationAvailable: '可以提名',
            nominationDelayDefault: '公聊开始后多久接受提名(分钟)',
            nominationWaitDefault: '提名等待时间',
            actorSpeechDefault: '提名者发言时间',
            targetSpeechDefault: '被提名者发言时间',
            voteDefault: '投票时间/人',
            recordVote: '记录投票',
            currentVoter: '当前投票',
            nominationSucceed: '提名成功',
            nominationFailed: '提名失败',
            skipVoting: '跳过投票',
            continueNomination: '继续提名',
            phaseBeforePrivate: '私聊前',
            phaseDuringPrivate: '私聊中',
            phaseBeforePublic: '公聊前',
            phaseDuringPublic: '公聊中',
            phaseDuringNomination: '提名中',
            // New keys
            gameSection: '游戏',
            daySection: '回合',
            playerSection: '玩家',
            bgmSection: '音乐',
            newGame: '新游戏',
            startNewGame: '开始新游戏',
            confirmEnd: '确认结束',
            distribution: '角色分配',
            townsfolk: '村民',
            outsider: '外来者',
            minion: '爪牙',
            demon: '恶魔',
            randomAssign: '随机分配',
            showAssign: '显示分配',
            hideAssign: '隐藏分配',
            winner: '获胜方',
            evil: '邪恶',
            good: '善良',
            playerTeam: '玩家阵营',
            playerNotes: '玩家备注',
            reviewModeLabel: '回顾模式',
            editMode: '编辑模式',
            addTraveler: '添加旅人',
            playerPool: '名字池',
            loadFakeNames: '加载假名',
            assignName: '分配名字',
            singleLoop: '单曲循环',
            loopAll: '列表循环',
            aggregatedLog: '综合日志',
            filterVote: '投票',
            filterSkill: '技能',
            filterEvent: '事件',
            allDays: '所有回合',
            sortAsc: '正序',
            sortDesc: '倒序',
            exportJson: '导出 JSON',
            importGame: '导入游戏',
            cancelNewGame: '取消',
            showLog: '显示日志',
            hideLog: '隐藏日志',
            seatAssignment: '座位分配',
            unassigned: '未分配',
            clickToAssign: '点击名字分配到下一个空位',
            removeFromSeat: '移除',
          }
        : {
            eyebrow: 'Storyteller Workbench',
            title: 'Storyteller Companion',
            playerCount: 'Player count',
            script: 'Script',
            currentScript: 'Current Script',
            controlConsole: 'Control Console',
            settings: 'Settings',
            gameActions: 'Actions',
            privateChat: 'Private',
            publicChat: 'Public',
            nomination: 'Nomination',
            freeSpeech: 'Free speech',
            roundRobinMode: 'Round robin',
            chooseSpeaker: 'Pick first',
            randomSpeaker: 'Random first',
            nextSpeaker: 'Next',
            start: 'Start/Pause',
            resetTimer: 'Reset',
            endNow: 'End',
            addTag: 'Add tag',
            startNomination: 'Start nomination',
            continuePublic: 'Resume public',
            recordDone: 'Record',
            clear: 'Clear',
            actor: 'Nominator',
            target: 'Nominee',
            voters: 'Yes votes',
            nonVoters: 'Non-voters',
            requiredVotes: 'Required',
            note: 'Note',
            statement: 'Statement',
            skillActor: 'Skill user',
            skillRole: 'Claimed role',
            skillTarget: 'Skill target',
            success: 'Success',
            failure: 'Failure',
            result: 'Result',
            aliveTag: 'Dead',
            executedTag: 'Executed',
            noVoteTag: 'No vote',
            traveler: 'Traveler',
            tagPool: 'Tag pool',
            clearUnusedTags: 'Clear unused tags',
            openSettings: 'Settings',
            closeSettings: 'Hide settings',
            selectedPlayer: 'Selected player',
            resetNames: 'Reset names',
            restartGame: 'Restart game',
            endGame: 'End game',
            privateDefault: 'Private default',
            publicFreeDefault: 'Public free time',
            publicRoundRobinDefault: 'Round robin / player',
            seatHint: 'Click seats to pick speaker, nominator, nominee, or skill targets.',
            voteTrail: 'Vote trail',
            skillTrail: 'Skill trail',
            sessionLog: 'Session log',
            completedGames: 'Completed games',
            noCompletedGames: 'No completed games yet.',
            systemOverridePass: 'Override pass',
            systemOverrideFail: 'Override fail',
            clearOverride: 'Clear override',
            pass: 'Pass',
            fail: 'Fail',
            confirm: 'Confirm',
            cancel: 'Cancel',
            restartTitle: 'Restart this game?',
            endGameTitle: 'End this game?',
            voteTitle: 'Confirm vote override?',
            waitingForNomination: 'Waiting for nomination...',
            actorSpeaking: 'Nominator speaking',
            targetSpeaking: 'Nominee speaking',
            readyToVote: 'Ready to vote',
            voting: 'Voting',
            votingDone: 'Voting complete',
            voteYes: 'Vote',
            startVoting: 'Start voting',
            pickNominator: 'Pick nominator',
            pickNominee: 'Pick nominee',
            useSkill: 'Use skill',
            saveSkill: 'Save',
            cancelSkill: 'Cancel',
            targetNote: 'Target note',
            bgm: 'BGM',
            play: 'Play',
            pause: 'Pause',
            loop: 'Loop',
            eventLog: 'Event log',
            nominationGate: 'Until nominations',
            nominationAvailable: 'Can nominate',
            nominationDelayDefault: 'Nomination delay (min)',
            nominationWaitDefault: 'Nomination wait',
            actorSpeechDefault: 'Actor speech',
            targetSpeechDefault: 'Nominee speech',
            voteDefault: 'Vote time / player',
            recordVote: 'Record vote',
            currentVoter: 'Current voter',
            nominationSucceed: 'Nomination Succeed',
            nominationFailed: 'Nomination Failed',
            skipVoting: 'Skip Voting',
            continueNomination: 'Next nomination',
            phaseBeforePrivate: 'Before private',
            phaseDuringPrivate: 'During private',
            phaseBeforePublic: 'Before public',
            phaseDuringPublic: 'During public',
            phaseDuringNomination: 'During nomination',
            // New keys
            gameSection: 'Game',
            daySection: 'Day',
            playerSection: 'Player',
            bgmSection: 'BGM',
            newGame: 'New Game',
            startNewGame: 'Start New Game',
            confirmEnd: 'Confirm End',
            distribution: 'Distribution',
            townsfolk: 'Townsfolk',
            outsider: 'Outsider',
            minion: 'Minion',
            demon: 'Demon',
            randomAssign: 'Random Assign',
            showAssign: 'Show Assign',
            hideAssign: 'Hide Assign',
            winner: 'Winner',
            evil: 'Evil',
            good: 'Good',
            playerTeam: 'Team',
            playerNotes: 'Notes',
            reviewModeLabel: 'Review Mode',
            editMode: 'Edit Mode',
            addTraveler: 'Add Traveler',
            playerPool: 'Name Pool',
            loadFakeNames: 'Load Fake Names',
            assignName: 'Assign Name',
            singleLoop: 'Single Loop',
            loopAll: 'Loop All',
            aggregatedLog: 'Aggregated Log',
            filterVote: 'Vote',
            filterSkill: 'Skill',
            filterEvent: 'Event',
            allDays: 'All Days',
            sortAsc: 'Ascending',
            sortDesc: 'Descending',
            exportJson: 'Export JSON',
            importGame: 'Import Game',
            cancelNewGame: 'Cancel',
            showLog: 'Show Log',
            hideLog: 'Hide Log',
            seatAssignment: 'Seat Assignment',
            unassigned: 'Unassigned',
            clickToAssign: 'Click a name to assign to the next empty seat',
            removeFromSeat: 'Remove',
          },
    [language],
  )

  // ── Derived ──
  const selectedDayIndex = Math.max(0, days.findIndex((d) => d.id === selectedDayId))
  const currentDay = days[selectedDayIndex] ?? days[0]

  function updateCurrentDay(updater: (day: DayState) => DayState) {
    setDays((cur) => cur.map((d) => (d.id === currentDay.id ? updater(d) : d)))
  }

  const currentTimerSeconds = useMemo(() => {
    const d = currentDay
    if (d.phase === 'private') return d.privateSeconds
    if (d.phase === 'public') return d.publicMode === 'free' ? d.publicFreeSeconds : d.publicRoundRobinSeconds
    switch (d.nominationStep) {
      case 'waitingForNomination': return d.nominationWaitSeconds
      case 'actorSpeech': return d.nominationActorSeconds
      case 'targetSpeech': return d.nominationTargetSeconds
      case 'voting': return d.votingState?.perPlayerSeconds ?? 0
      default: return 0
    }
  }, [currentDay])

  const currentScriptCharacters = useMemo(
    () => scriptOptions.find((s) => s.slug === activeScriptSlug)?.characters ?? scriptOptions[0]?.characters ?? [],
    [activeScriptSlug, scriptOptions],
  )
  const livingNonTravelerSeats = useMemo(
    () => currentDay.seats.filter((s) => s.alive && !s.isTraveler),
    [currentDay.seats],
  )
  const requiredVotes = Math.max(1, Math.ceil(livingNonTravelerSeats.length / 2))
  const eligibleVoterSeats = useMemo(
    () => currentDay.seats.filter((s) => !s.hasNoVote).map((s) => s.seat),
    [currentDay.seats],
  )
  const nonVoters = useMemo(
    () => eligibleVoterSeats.filter((s) => !currentDay.voteDraft.voters.includes(s)),
    [currentDay.voteDraft.voters, eligibleVoterSeats],
  )
  void nonVoters // keep variable used
  const draftPassedBySystem = currentDay.voteDraft.voters.length >= requiredVotes
  const draftPassed = currentDay.voteDraft.manualPassed ?? draftPassedBySystem

  const isVotingComplete =
    currentDay.nominationStep === 'votingDone' ||
    (currentDay.nominationStep === 'voting' &&
      currentDay.votingState &&
      currentDay.votingState.votingIndex >= currentDay.votingState.votingOrder.length)

  const currentVoterSeat =
    currentDay.votingState && currentDay.nominationStep === 'voting' && !isVotingComplete
      ? currentDay.votingState.votingOrder[currentDay.votingState.votingIndex] ?? null
      : null

  const pointerSeat = useMemo(() => {
    if (currentDay.phase === 'public' && currentDay.publicMode === 'roundRobin') return currentDay.currentSpeakerSeat
    if (currentDay.phase === 'nomination') {
      if (currentVoterSeat) return currentVoterSeat
      return currentDay.voteDraft.target ?? currentDay.voteDraft.actor ?? null
    }
    return null
  }, [currentDay.phase, currentDay.publicMode, currentDay.currentSpeakerSeat, currentDay.voteDraft, currentVoterSeat])

  const selectedSeat = currentDay.seats.find((s) => s.seat === selectedSeatNumber) ?? null
  const selectedSeatTags = selectedSeat
    ? [
        !selectedSeat.alive ? text.aliveTag : '',
        selectedSeat.isExecuted ? text.executedTag : '',
        selectedSeat.isTraveler ? text.traveler : '',
        selectedSeat.hasNoVote ? text.noVoteTag : '',
        ...selectedSeat.customTags,
      ].filter(Boolean)
    : []

  const dialogTitle =
    dialogState?.kind === 'restartGame' ? text.restartTitle
      : dialogState?.kind === 'endGame' ? text.endGameTitle
      : text.voteTitle

  const nominationDelaySeconds = timerDefaults.nominationDelayMinutes * 60
  const secondsUntilNomination = Math.max(0, nominationDelaySeconds - currentDay.publicElapsedSeconds)
  const canNominate = currentDay.phase === 'public' && currentDay.publicMode === 'free' && currentDay.publicElapsedSeconds >= nominationDelaySeconds

  // ── Aggregated log ──
  const aggregatedLog = useMemo((): AggregatedLogEntry[] => {
    const entries: AggregatedLogEntry[] = []
    for (const day of days) {
      for (const v of day.voteHistory) {
        entries.push({
          id: `v-${day.day}-${v.id}`,
          day: day.day,
          timestamp: Number(v.id),
          type: 'vote',
          detail: `#${v.actor} -> #${v.target}: ${v.passed ? 'PASS' : 'FAIL'} (${v.voteCount}/${v.requiredVotes})${v.note ? ` - ${v.note}` : ''}`,
        })
      }
      for (const s of day.skillHistory) {
        entries.push({
          id: `s-${day.day}-${s.id}`,
          day: day.day,
          timestamp: Number(s.id),
          type: 'skill',
          detail: `#${s.actor} ${s.roleId || '?'} (${s.activatedDuringPhase})${s.statement ? ` "${s.statement}"` : ''}${s.result ? ` [${s.result}]` : ''}`,
        })
      }
      for (const e of day.eventLog) {
        if (e.kind === 'vote' || e.kind === 'skill') continue // already covered
        entries.push({
          id: `e-${day.day}-${e.id}`,
          day: day.day,
          timestamp: e.timestamp,
          type: 'event',
          detail: `[${e.kind}] ${e.detail}`,
        })
      }
    }
    // Apply filters
    let filtered = entries.filter((e) => logFilter.types.has(e.type))
    if (logFilter.dayFilter !== 'all') {
      filtered = filtered.filter((e) => e.day === logFilter.dayFilter)
    }
    filtered.sort((a, b) => logFilter.sortAsc ? a.timestamp - b.timestamp : b.timestamp - a.timestamp)
    return filtered
  }, [days, logFilter])

  function getPhaseContext(): string {
    const d = currentDay
    if (d.phase === 'private') {
      return d.privateSeconds === timerDefaults.privateSeconds && !isTimerRunning ? text.phaseBeforePrivate : text.phaseDuringPrivate
    }
    if (d.phase === 'public') {
      return d.publicElapsedSeconds === 0 && !isTimerRunning ? text.phaseBeforePublic : text.phaseDuringPublic
    }
    return text.phaseDuringNomination
  }

  // ── Core Helpers ──
  function setCurrentTimer(value: number) {
    const safe = Math.max(0, value)
    updateCurrentDay((d) => {
      if (d.phase === 'private') return { ...d, privateSeconds: safe }
      if (d.phase === 'public' && d.publicMode === 'free') return { ...d, publicFreeSeconds: safe }
      if (d.phase === 'public' && d.publicMode === 'roundRobin') return { ...d, publicRoundRobinSeconds: safe }
      if (d.nominationStep === 'waitingForNomination') return { ...d, nominationWaitSeconds: safe }
      if (d.nominationStep === 'actorSpeech') return { ...d, nominationActorSeconds: safe }
      if (d.nominationStep === 'targetSpeech') return { ...d, nominationTargetSeconds: safe }
      if (d.nominationStep === 'voting' && d.votingState) return { ...d, votingState: { ...d.votingState, perPlayerSeconds: safe } }
      return d
    })
  }

  function syncDayTimers(d: DayState) {
    return {
      ...d,
      privateSeconds: timerDefaults.privateSeconds,
      publicFreeSeconds: timerDefaults.publicFreeSeconds,
      publicRoundRobinSeconds: timerDefaults.publicRoundRobinSeconds,
      nominationWaitSeconds: timerDefaults.nominationWaitSeconds,
      nominationActorSeconds: timerDefaults.nominationActorSeconds,
      nominationTargetSeconds: timerDefaults.nominationTargetSeconds,
    }
  }

  function appendEvent(d: DayState, kind: EventLogEntry['kind'], detail: string): DayState {
    return {
      ...d,
      eventLog: [...d.eventLog, { id: makeEventId(), timestamp: Date.now(), phase: d.phase, kind, detail }],
    }
  }

  // ── Effects ──

  // Persistence
  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ selectedDayId, timerDefaults, days, customTagPool, gameRecords, playerNamePool } satisfies PersistedState),
    )
  }, [customTagPool, days, gameRecords, playerNamePool, selectedDayId, timerDefaults])

  // Auto-set picker mode for nomination
  useEffect(() => {
    if (currentDay.phase === 'nomination' && currentDay.nominationStep === 'waitingForNomination' && !currentDay.voteDraft.actor) {
      setPickerMode('nominator')
    }
  }, [currentDay.phase, currentDay.nominationStep, currentDay.voteDraft.actor])

  // Timer tick
  useEffect(() => {
    if (!isTimerRunning || skillOverlay) return
    const timer = window.setInterval(() => {
      updateCurrentDay((d) => {
        // PRIVATE
        if (d.phase === 'private') {
          if (d.privateSeconds <= 1) {
            return appendEvent({ ...d, privateSeconds: 0, phase: 'public', publicMode: 'free' }, 'phaseTransition', '私聊 → 公聊')
          }
          return { ...d, privateSeconds: d.privateSeconds - 1 }
        }
        // PUBLIC FREE
        if (d.phase === 'public' && d.publicMode === 'free') {
          const nextElapsed = d.publicElapsedSeconds + 1
          if (d.publicFreeSeconds <= 1) {
            return appendEvent(
              { ...d, publicFreeSeconds: 0, publicElapsedSeconds: nextElapsed, phase: 'nomination', nominationStep: 'waitingForNomination', nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteDraft: createDefaultVoteDraft(), votingState: null },
              'phaseTransition',
              '公聊 → 提名',
            )
          }
          return { ...d, publicFreeSeconds: d.publicFreeSeconds - 1, publicElapsedSeconds: nextElapsed }
        }
        // PUBLIC ROUND ROBIN
        if (d.phase === 'public' && d.publicMode === 'roundRobin') {
          if (d.publicRoundRobinSeconds <= 1) {
            const spoken = d.currentSpeakerSeat ? unique([...d.roundRobinSpokenSeats, d.currentSpeakerSeat]) : d.roundRobinSpokenSeats
            const next = getNextRoundRobinSeat(d.seats, d.currentSpeakerSeat, spoken)
            if (!next) {
              return { ...d, roundRobinSpokenSeats: spoken, publicRoundRobinSeconds: 0, publicMode: 'free' }
            }
            return { ...d, roundRobinSpokenSeats: spoken, currentSpeakerSeat: next, publicRoundRobinSeconds: timerDefaults.publicRoundRobinSeconds }
          }
          return { ...d, publicRoundRobinSeconds: d.publicRoundRobinSeconds - 1 }
        }
        // NOMINATION WAITING
        if (d.phase === 'nomination' && d.nominationStep === 'waitingForNomination') {
          if (d.nominationWaitSeconds <= 1) {
            window.setTimeout(() => setIsTimerRunning(false), 0)
            return { ...d, nominationWaitSeconds: 0 }
          }
          return { ...d, nominationWaitSeconds: d.nominationWaitSeconds - 1 }
        }
        // NOMINATION ACTOR SPEECH
        if (d.phase === 'nomination' && d.nominationStep === 'actorSpeech') {
          if (d.nominationActorSeconds <= 1) {
            return { ...d, nominationActorSeconds: 0, nominationStep: 'targetSpeech', nominationTargetSeconds: timerDefaults.nominationTargetSeconds }
          }
          return { ...d, nominationActorSeconds: d.nominationActorSeconds - 1 }
        }
        // NOMINATION TARGET SPEECH
        if (d.phase === 'nomination' && d.nominationStep === 'targetSpeech') {
          if (d.nominationTargetSeconds <= 1) {
            window.setTimeout(() => setIsTimerRunning(false), 0)
            return { ...d, nominationTargetSeconds: 0, nominationStep: 'readyToVote' }
          }
          return { ...d, nominationTargetSeconds: d.nominationTargetSeconds - 1 }
        }
        // NOMINATION VOTING
        if (d.phase === 'nomination' && d.nominationStep === 'voting' && d.votingState) {
          const vs = d.votingState
          if (vs.perPlayerSeconds <= 1) {
            const voter = vs.votingOrder[vs.votingIndex]
            const newVotes = { ...vs.votes, [voter]: vs.votes[voter] ?? false }
            const nextIdx = vs.votingIndex + 1
            if (nextIdx >= vs.votingOrder.length) {
              window.setTimeout(() => setIsTimerRunning(false), 0)
              const yesVoters = Object.entries(newVotes).filter(([, v]) => v).map(([k]) => Number(k))
              return {
                ...d,
                nominationStep: 'votingDone',
                voteDraft: { ...d.voteDraft, voters: yesVoters },
                votingState: { ...vs, votes: newVotes, votingIndex: nextIdx, perPlayerSeconds: 0 },
              }
            }
            return { ...d, votingState: { ...vs, votingIndex: nextIdx, perPlayerSeconds: timerDefaults.nominationVoteSeconds, votes: newVotes } }
          }
          return { ...d, votingState: { ...vs, perPlayerSeconds: vs.perPlayerSeconds - 1 } }
        }
        return d
      })
    }, 1000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDay.id, isTimerRunning, skillOverlay, timerDefaults])

  // Countdown speech
  useEffect(() => {
    const isRoundRobin = currentDay.phase === 'public' && currentDay.publicMode === 'roundRobin'
    const isVoting = currentDay.phase === 'nomination' && currentDay.nominationStep === 'voting'
    const threshold = isRoundRobin || isVoting ? 3 : currentTimerSeconds <= 10 ? currentTimerSeconds : 10
    const noTimer = currentDay.nominationStep === 'readyToVote' || currentDay.nominationStep === 'votingDone'
    if (!isTimerRunning || currentTimerSeconds <= 0 || noTimer) {
      lastCountdownRef.current = null
      return
    }
    if (currentTimerSeconds <= threshold && currentTimerSeconds !== lastCountdownRef.current) {
      lastCountdownRef.current = currentTimerSeconds
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(String(currentTimerSeconds)))
      }
    }
  }, [currentDay.phase, currentDay.publicMode, currentDay.nominationStep, currentTimerSeconds, isTimerRunning])

  // Audio
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const track = AUDIO_TRACKS[audioTrackIndex]
    if (!track) return
    audio.src = track.src
    audio.loop = audioLoopMode === 'single'
    if (audioPlaying) {
      audio.load()
      audio.play().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioTrackIndex])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audioPlaying) audio.play().catch(() => {})
    else audio.pause()
  }, [audioPlaying])

  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = audioLoopMode === 'single'
  }, [audioLoopMode])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnded = () => {
      if (audioLoopMode === 'all') {
        setAudioTrackIndex((i) => (i + 1) % AUDIO_TRACKS.length)
      }
      // 'single' is handled by audio.loop = true
    }
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [audioLoopMode])

  // ── Functions ──

  function updatePlayerCount(nextCount: number) {
    const safe = Math.max(5, Math.min(15, nextCount))
    updateCurrentDay((d) => {
      const nextSeats =
        d.seats.length > safe
          ? d.seats.slice(0, safe)
          : [...d.seats, ...Array.from({ length: safe - d.seats.length }, (_, i) => ({
              seat: d.seats.length + i + 1, name: `Player ${d.seats.length + i + 1}`,
              alive: true, isTraveler: false, isExecuted: false, hasNoVote: false, customTags: [],
            }))]
      return { ...d, seats: nextSeats }
    })
  }

  function resetSeatNames() {
    updateCurrentDay((d) => ({ ...d, seats: d.seats.map((s) => ({ ...s, name: `Player ${s.seat}` })) }))
  }

  function updateSeat(seatNumber: number, updater: (s: StorytellerSeat) => StorytellerSeat) {
    updateCurrentDay((d) => ({ ...d, seats: d.seats.map((s) => (s.seat === seatNumber ? updater(s) : s)) }))
  }

  function updateSeatWithLog(seatNumber: number, updater: (s: StorytellerSeat) => StorytellerSeat) {
    updateCurrentDay((d) => {
      const oldSeat = d.seats.find((s) => s.seat === seatNumber)
      const newSeats = d.seats.map((s) => (s.seat === seatNumber ? updater(s) : s))
      const newSeat = newSeats.find((s) => s.seat === seatNumber)
      let updated = { ...d, seats: newSeats }
      if (oldSeat && newSeat) {
        if (oldSeat.alive !== newSeat.alive) updated = appendEvent(updated, 'stateChange', `#${seatNumber} ${newSeat.alive ? '复活' : '死亡'}`)
        if (oldSeat.isExecuted !== newSeat.isExecuted) updated = appendEvent(updated, 'stateChange', `#${seatNumber} ${newSeat.isExecuted ? '+处决' : '-处决'}`)
        if (oldSeat.isTraveler !== newSeat.isTraveler) updated = appendEvent(updated, 'stateChange', `#${seatNumber} ${newSeat.isTraveler ? '+旅人' : '-旅人'}`)
        if (oldSeat.hasNoVote !== newSeat.hasNoVote) updated = appendEvent(updated, 'stateChange', `#${seatNumber} ${newSeat.hasNoVote ? '+无投票权' : '-无投票权'}`)
        const added = newSeat.customTags.filter((t) => !oldSeat.customTags.includes(t))
        const removed = oldSeat.customTags.filter((t) => !newSeat.customTags.includes(t))
        for (const t of added) updated = appendEvent(updated, 'tagChange', `#${seatNumber} +${t}`)
        for (const t of removed) updated = appendEvent(updated, 'tagChange', `#${seatNumber} -${t}`)
      }
      return updated
    })
  }

  function addCustomTag(seatNumber: number) {
    const draft = seatTagDrafts[seatNumber]?.trim()
    if (!draft) return
    setCustomTagPool((cur) => uniqueStrings([...cur, draft]))
    updateSeatWithLog(seatNumber, (s) => ({ ...s, customTags: uniqueStrings([...s.customTags, draft]) }))
    setSeatTagDrafts((cur) => ({ ...cur, [seatNumber]: '' }))
  }

  function clearUnusedCustomTags() {
    const usedTags = new Set(days.flatMap((d) => d.seats.flatMap((s) => s.customTags)))
    setCustomTagPool((cur) => cur.filter((t) => usedTags.has(t)))
  }

  function enterNomination() {
    updateCurrentDay((d) =>
      appendEvent(
        { ...d, phase: 'nomination', nominationStep: 'waitingForNomination', nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteDraft: createDefaultVoteDraft(), votingState: null },
        'phaseTransition',
        '公聊 → 提名',
      ),
    )
    setPickerMode('nominator')
    setIsTimerRunning(true)
  }

  function confirmNomination() {
    updateCurrentDay((d) => ({
      ...d,
      nominationStep: 'actorSpeech',
      nominationActorSeconds: timerDefaults.nominationActorSeconds,
    }))
    setIsTimerRunning(true)
  }

  function rejectNomination() {
    updateCurrentDay((d) =>
      appendEvent(
        { ...d, nominationStep: 'waitingForNomination', nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteDraft: createDefaultVoteDraft(), votingState: null },
        'event',
        `提名失败: #${d.voteDraft.actor ?? '?'} → #${d.voteDraft.target ?? '?'}`,
      ),
    )
    setPickerMode('nominator')
    setIsTimerRunning(true)
  }

  function skipVoting() {
    updateCurrentDay((d) =>
      appendEvent(
        { ...d, nominationStep: 'waitingForNomination', nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteDraft: createDefaultVoteDraft(), votingState: null },
        'event',
        `跳过投票: #${d.voteDraft.actor ?? '?'} → #${d.voteDraft.target ?? '?'}`,
      ),
    )
    setPickerMode('nominator')
    setIsTimerRunning(true)
  }

  function startVoting() {
    if (!currentDay.voteDraft.target) return
    const order = buildVotingOrder(currentDay.seats, currentDay.voteDraft.target)
    updateCurrentDay((d) => ({
      ...d,
      nominationStep: 'voting',
      votingState: { votingOrder: order, votingIndex: 0, perPlayerSeconds: timerDefaults.nominationVoteSeconds, votes: {} },
    }))
    setPickerMode('none')
    setIsTimerRunning(true)
  }

  function handleVoteYes(seatNumber: number) {
    updateCurrentDay((d) => {
      if (!d.votingState || d.nominationStep !== 'voting') return d
      const vs = d.votingState
      const voter = vs.votingOrder[vs.votingIndex]
      if (seatNumber !== voter) return d
      const newVotes = { ...vs.votes, [seatNumber]: true }
      const nextIdx = vs.votingIndex + 1
      if (nextIdx >= vs.votingOrder.length) {
        window.setTimeout(() => setIsTimerRunning(false), 0)
        const yesVoters = Object.entries(newVotes).filter(([, v]) => v).map(([k]) => Number(k))
        return { ...d, nominationStep: 'votingDone', voteDraft: { ...d.voteDraft, voters: yesVoters }, votingState: { ...vs, votes: newVotes, votingIndex: nextIdx, perPlayerSeconds: 0 } }
      }
      return { ...d, votingState: { ...vs, votes: newVotes, votingIndex: nextIdx, perPlayerSeconds: timerDefaults.nominationVoteSeconds } }
    })
  }

  function recordVote() {
    if (!currentDay.voteDraft.actor || !currentDay.voteDraft.target) return
    const record: VoteRecord = {
      id: `${Date.now()}`,
      actor: currentDay.voteDraft.actor,
      target: currentDay.voteDraft.target,
      voters: unique(currentDay.voteDraft.voters),
      voteCount: currentDay.voteDraft.voters.length,
      requiredVotes,
      passed: draftPassed,
      note: currentDay.voteDraft.note.trim(),
      overridden: currentDay.voteDraft.manualPassed !== null,
    }
    updateCurrentDay((d) =>
      appendEvent(
        { ...d, nominationStep: 'waitingForNomination', nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteHistory: [record, ...d.voteHistory], voteDraft: createDefaultVoteDraft(), votingState: null },
        'vote',
        `#${record.actor} → #${record.target}: ${record.passed ? 'PASS' : 'FAIL'} (${record.voteCount}/${record.requiredVotes})`,
      ),
    )
    setPickerMode('nominator')
    setIsTimerRunning(true)
  }

  function openSkillOverlay() {
    const ctx = getPhaseContext()
    setSkillOverlay({
      pausedPhase: currentDay.phase,
      wasTimerRunning: isTimerRunning,
      draft: createDefaultSkillDraft(),
      phaseContext: ctx,
    })
    setIsTimerRunning(false)
    setPickerMode('skillActor')
  }

  function closeSkillOverlay(record: boolean) {
    if (record && skillOverlay?.draft.actor) {
      const sr: SkillRecord = { id: `${Date.now()}`, ...skillOverlay.draft, activatedDuringPhase: skillOverlay.phaseContext }
      updateCurrentDay((d) =>
        appendEvent({ ...d, skillHistory: [sr, ...d.skillHistory] }, 'skill', `#${sr.actor} ${sr.roleId || '?'} (${sr.activatedDuringPhase})`),
      )
    }
    const wasRunning = skillOverlay?.wasTimerRunning ?? false
    setSkillOverlay(null)
    setPickerMode('none')
    if (wasRunning) setIsTimerRunning(true)
  }

  function moveToNextSpeaker() {
    const cur = currentDay.currentSpeakerSeat
    const spoken = cur ? unique([...currentDay.roundRobinSpokenSeats, cur]) : currentDay.roundRobinSpokenSeats
    const next = getNextRoundRobinSeat(currentDay.seats, cur, spoken)
    updateCurrentDay((d) => ({ ...d, roundRobinSpokenSeats: spoken, currentSpeakerSeat: next, publicRoundRobinSeconds: next ? timerDefaults.publicRoundRobinSeconds : 0 }))
    if (!next) setIsTimerRunning(false)
  }

  function goToNextDay() {
    if (selectedDayIndex < days.length - 1) {
      setSelectedDayId(days[selectedDayIndex + 1].id)
      setIsTimerRunning(false)
      return
    }
    const next = createDayState(days.length + 1, currentDay.seats, timerDefaults)
    setDays((cur) => [...cur, next])
    setSelectedDayId(next.id)
    setPickerMode('none')
    setIsTimerRunning(false)
  }

  function goToPreviousDay() {
    if (selectedDayIndex === 0) return
    setSelectedDayId(days[selectedDayIndex - 1].id)
    setPickerMode('none')
    setIsTimerRunning(false)
  }

  function saveCurrentGame(winner?: 'evil' | 'good' | null, playerSummaries?: GameRecord['playerSummaries']) {
    setGameRecords((cur) => [
      {
        id: `${Date.now()}`,
        endedAt: Date.now(),
        scriptTitle: activeScriptTitle,
        scriptSlug: activeScriptSlug,
        winner: winner ?? null,
        playerSummaries,
        days: days.map((d) => ({ day: d.day, votes: d.voteHistory.length, skills: d.skillHistory.length })),
      },
      ...cur,
    ])
  }

  function resetCurrentGame() {
    const firstDay = createDayState(1, createSeats(DEFAULT_PLAYER_COUNT), timerDefaults)
    setDays([firstDay])
    setSelectedDayId(firstDay.id)
    setPickerMode('none')
    setIsTimerRunning(false)
    setSeatTagDrafts({})
    setSkillOverlay(null)
  }

  function confirmDialog() {
    if (!dialogState) return
    if (dialogState.kind === 'voteResult') {
      updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, manualPassed: dialogState.nextValue } }))
      setDialogState(null)
      return
    }
    if (dialogState.kind === 'endGame') {
      saveCurrentGame()
      resetCurrentGame()
      setDialogState(null)
      return
    }
    resetCurrentGame()
    setDialogState(null)
  }

  function handleSeatClick(seatNumber: number) {
    setSelectedSeatNumber(seatNumber)

    if (pickerMode === 'speaker') {
      updateCurrentDay((d) => ({ ...d, currentSpeakerSeat: seatNumber, roundRobinSpokenSeats: [], publicRoundRobinSeconds: timerDefaults.publicRoundRobinSeconds }))
      setPickerMode('none')
      return
    }
    if (pickerMode === 'nominator') {
      updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, actor: seatNumber } }))
      setPickerMode('nominee')
      setIsTimerRunning(false)
      return
    }
    if (pickerMode === 'nominee') {
      updateCurrentDay((d) => ({
        ...d,
        nominationStep: 'nominationDecision',
        voteDraft: { ...d.voteDraft, target: seatNumber, voters: [] },
      }))
      setPickerMode('none')
      setIsTimerRunning(false)
      return
    }
    if (pickerMode === 'skillActor') {
      setSkillOverlay((p) => (p ? { ...p, draft: { ...p.draft, actor: seatNumber } } : p))
      return
    }
    if (pickerMode === 'skillTarget') {
      setSkillOverlay((p) => {
        if (!p) return p
        const targets = p.draft.targets.includes(seatNumber) ? p.draft.targets.filter((s) => s !== seatNumber) : unique([...p.draft.targets, seatNumber])
        const targetNotes = { ...p.draft.targetNotes }
        for (const k of Object.keys(targetNotes)) {
          if (!targets.includes(Number(k))) delete targetNotes[Number(k)]
        }
        return { ...p, draft: { ...p.draft, targets, targetNotes } }
      })
      return
    }
    // During voting, clicking current voter = vote yes
    if (currentDay.nominationStep === 'voting' && currentVoterSeat === seatNumber) {
      handleVoteYes(seatNumber)
    }
  }

  function removeSeatTag(seatNumber: number, tag: string) {
    updateSeatWithLog(seatNumber, (s) => {
      if (tag === text.aliveTag) return { ...s, alive: true }
      if (tag === text.executedTag) return { ...s, isExecuted: false }
      if (tag === text.traveler) return { ...s, isTraveler: false }
      if (tag === text.noVoteTag) return { ...s, hasNoVote: false }
      return { ...s, customTags: s.customTags.filter((v) => v !== tag) }
    })
  }

  function setPhase(phase: Phase) {
    updateCurrentDay((d) => {
      let next = { ...d, phase }
      if (phase === 'nomination') {
        next = { ...next, nominationStep: 'waitingForNomination' as NominationStep, nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteDraft: createDefaultVoteDraft(), votingState: null }
      }
      return appendEvent(next, 'phaseTransition', `→ ${phase}`)
    })
    setPickerMode('none')
    setIsTimerRunning(false)
  }

  function resumePublic() {
    setPhase('public')
  }

  function addTravelerSeat() {
    updateCurrentDay((d) => {
      const nextSeatNum = d.seats.length + 1
      const newSeat: StorytellerSeat = {
        seat: nextSeatNum,
        name: `Traveler ${nextSeatNum}`,
        alive: true,
        isTraveler: true,
        isExecuted: false,
        hasNoVote: false,
        customTags: [],
      }
      return { ...d, seats: [...d.seats, newSeat] }
    })
  }

  // ── New Game ──
  function openNewGamePanel() {
    const slug = activeScriptSlug ?? scriptOptions[0]?.slug ?? ''
    // Pre-fill seat names from pool
    const seatNames: Record<number, string> = {}
    for (let i = 0; i < Math.min(DEFAULT_PLAYER_COUNT, playerNamePool.length); i++) {
      seatNames[i + 1] = playerNamePool[i]
    }
    setNewGamePanel({
      playerCount: DEFAULT_PLAYER_COUNT,
      scriptSlug: slug,
      randomAssign: false,
      assignments: [],
      showAssignments: false,
      seatNames,
    })
  }

  function randomAssignCharacters(config: NewGameConfig): CharacterAssignment[] {
    const dist = CHARACTER_DISTRIBUTION[config.playerCount]
    if (!dist) return []
    const script = scriptOptions.find((s) => s.slug === config.scriptSlug)
    if (!script) return []

    const byTeam: Record<string, string[]> = { townsfolk: [], outsider: [], minion: [], demon: [] }
    for (const cid of script.characters) {
      const char = characterById[cid]
      if (char && byTeam[char.team]) {
        byTeam[char.team].push(cid)
      }
    }

    const assignments: CharacterAssignment[] = []
    const teams: Array<{ team: Team; count: number }> = [
      { team: 'townsfolk', count: dist.townsfolk },
      { team: 'outsider', count: dist.outsider },
      { team: 'minion', count: dist.minion },
      { team: 'demon', count: dist.demon },
    ]

    let seatNum = 1
    for (const { team, count } of teams) {
      const pool = shuffleArray(byTeam[team] ?? [])
      for (let i = 0; i < count; i++) {
        const cid = pool[i] ?? ''
        assignments.push({ seat: seatNum, characterId: cid, team })
        seatNum++
      }
    }

    return shuffleArray(assignments).map((a, i) => ({ ...a, seat: i + 1 }))
  }

  function startNewGame() {
    if (!newGamePanel) return
    const slug = newGamePanel.scriptSlug
    if (onSelectScript) onSelectScript(slug)

    const seats = createSeats(newGamePanel.playerCount)
    // Apply seat names from new game config
    for (const seat of seats) {
      const name = newGamePanel.seatNames[seat.seat]
      if (name) seat.name = name
    }

    const firstDay = createDayState(1, seats, timerDefaults)
    setDays([firstDay])
    setSelectedDayId(firstDay.id)
    setPickerMode('none')
    setIsTimerRunning(false)
    setSeatTagDrafts({})
    setSkillOverlay(null)
    setReviewMode(false)
    setNewGamePanel(null)
  }

  // ── End Game ──
  function openEndGamePanel() {
    const notes: Record<number, string> = {}
    const teams: Record<number, string> = {}
    for (const s of currentDay.seats) {
      notes[s.seat] = ''
      teams[s.seat] = 'good'
    }
    setEndGameResult({ winner: null, playerNotes: notes, playerTeams: teams })
  }

  function confirmEndGame() {
    if (!endGameResult) return
    const summaries = currentDay.seats.map((s) => ({
      seat: s.seat,
      name: s.name,
      team: endGameResult.playerTeams[s.seat] ?? 'good',
      notes: endGameResult.playerNotes[s.seat] ?? '',
    }))
    saveCurrentGame(endGameResult.winner, summaries)
    setEndGameResult(null)
    setReviewMode(true)
  }

  // ── Export ──
  function exportGameJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      scriptTitle: activeScriptTitle,
      scriptSlug: activeScriptSlug,
      days: days.map((d) => ({
        day: d.day,
        seats: d.seats,
        voteHistory: d.voteHistory,
        skillHistory: d.skillHistory,
        eventLog: d.eventLog,
      })),
      gameRecords,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `botc-game-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function toggleLogFilterType(type: string) {
    setLogFilter((prev) => {
      const next = new Set(prev.types)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return { ...prev, types: next }
    })
  }

  // ── Computed for voting ──
  const votingYesCount = currentDay.votingState
    ? Object.values(currentDay.votingState.votes).filter(Boolean).length + (currentDay.voteDraft.voters.length > 0 ? 0 : 0)
    : currentDay.voteDraft.voters.length

  // ── JSX ──────────────────────────────────────────────────────
  const hasTimer = currentDay.nominationStep !== 'nominationDecision' && currentDay.nominationStep !== 'readyToVote' && currentDay.nominationStep !== 'votingDone'

  function toggleConsoleSection(section: ConsoleSection) {
    setActiveConsoleSection((cur) => cur === section ? null : section)
  }

  return (
    <section className="storyteller-layout">
      <section className="storyteller-panel">
        {/* Header */}
        <div className="viewer-panel__header">
          <div>
            <p className="viewer-panel__eyebrow">{text.eyebrow}</p>
            <h2>{text.title}</h2>
          </div>
          <div className="storyteller-header-meta">
            {activeScriptTitle ? <span className="storyteller-script-badge">{text.currentScript}: {activeScriptTitle}</span> : null}
          </div>
        </div>

        {/* Review mode banner */}
        {reviewMode ? (
          <div className="storyteller-review-banner">
            <span>{text.reviewModeLabel}</span>
            <button className="secondary-button secondary-button--small" onClick={() => setReviewMode(false)} type="button">{text.editMode}</button>
          </div>
        ) : null}

        {/* Board */}
        <section className={`storyteller-board${showLogPanel ? ' storyteller-board--with-log' : ''}`}>
          {/* Log panel (left of table) */}
          {showLogPanel ? (
            <aside className="storyteller-log-sidebar">
              <div className="storyteller-log-sidebar__header">
                <h3>{text.aggregatedLog}</h3>
                <button className="secondary-button secondary-button--small" onClick={() => setShowLogPanel(false)} type="button">{text.hideLog}</button>
              </div>
              <div className="storyteller-log-filters">
                <button className={`secondary-button secondary-button--small${logFilter.types.has('vote') ? ' tab-button--active' : ''}`} onClick={() => toggleLogFilterType('vote')} type="button">{text.filterVote}</button>
                <button className={`secondary-button secondary-button--small${logFilter.types.has('skill') ? ' tab-button--active' : ''}`} onClick={() => toggleLogFilterType('skill')} type="button">{text.filterSkill}</button>
                <button className={`secondary-button secondary-button--small${logFilter.types.has('event') ? ' tab-button--active' : ''}`} onClick={() => toggleLogFilterType('event')} type="button">{text.filterEvent}</button>
                <select
                  className="storyteller-day-select"
                  onChange={(e) => setLogFilter((prev) => ({ ...prev, dayFilter: e.target.value === 'all' ? 'all' : Number(e.target.value) }))}
                  value={logFilter.dayFilter}
                >
                  <option value="all">{text.allDays}</option>
                  {days.map((d) => <option key={d.id} value={d.day}>Day {d.day}</option>)}
                </select>
                <button className="secondary-button secondary-button--small" onClick={() => setLogFilter((prev) => ({ ...prev, sortAsc: !prev.sortAsc }))} type="button">
                  {logFilter.sortAsc ? text.sortAsc : text.sortDesc}
                </button>
              </div>
              <div className="storyteller-log-sidebar__entries">
                {aggregatedLog.length ? aggregatedLog.map((entry) => (
                  <article className={`storyteller-log-entry storyteller-log-entry--${entry.type}`} key={entry.id}>
                    <div className="storyteller-history__top">
                      <span className="storyteller-log-badge" data-type={entry.type}>
                        {entry.type === 'vote' ? text.filterVote : entry.type === 'skill' ? text.filterSkill : text.filterEvent}
                      </span>
                      <span>Day {entry.day}</span>
                    </div>
                    <p>{entry.detail}</p>
                  </article>
                )) : <p className="storyteller-panel__hint">—</p>}
              </div>
            </aside>
          ) : null}

          {/* Table */}
          <section className="storyteller-table-card storyteller-workcard">
            <div className="storyteller-table-card__top">
              <div className="storyteller-table-card__toolbar">
                <label className="editor-field storyteller-count">
                  <span>{text.playerCount}</span>
                  <input disabled={reviewMode} max="15" min="5" onChange={(e) => updatePlayerCount(Number(e.target.value))} type="range" value={currentDay.seats.length} />
                <strong>{currentDay.seats.length}</strong>
              </label>
                {!showLogPanel ? (
                  <button className="secondary-button secondary-button--small" onClick={() => setShowLogPanel(true)} type="button">{text.showLog}</button>
                ) : null}
              </div>
            </div>

            <div className="storyteller-table" onClick={() => { setSelectedSeatNumber(null); if (pickerMode === 'none') setPickerMode('none') }} role="presentation">
              <div className="storyteller-table__ring" />
              {pointerSeat ? (
                <div className="storyteller-table__hand" style={{ '--pointer-angle': `${((pointerSeat - 1) / currentDay.seats.length) * 360 - 90}deg` } as CSSProperties} />
              ) : null}

              {/* ── Center ── */}
              <section className="storyteller-center">
                {/* Phase label + mode */}
                <div className="storyteller-center__phase">
                  <span className="storyteller-center__phase-label">
                    {currentDay.phase === 'private' ? text.privateChat
                      : currentDay.phase === 'public' ? text.publicChat
                      : currentDay.nominationStep === 'voting' || currentDay.nominationStep === 'votingDone' ? text.voting
                      : text.nomination}
                  </span>
                  {currentDay.phase === 'public' ? (
                    <select
                      className="storyteller-center__mode-select"
                      disabled={reviewMode}
                      onChange={(e) => updateCurrentDay((d) => ({ ...d, publicMode: e.target.value as PublicMode }))}
                      value={currentDay.publicMode}
                    >
                      <option value="free">{text.freeSpeech}</option>
                      <option value="roundRobin">{text.roundRobinMode}</option>
                    </select>
                  ) : null}
                </div>

                {/* Timer */}
                {hasTimer ? (
                  <input
                    aria-label="Current timer"
                    className="storyteller-center__timer-input"
                    disabled={reviewMode}
                    min="0"
                    onChange={(e) => setCurrentTimer(Number(e.target.value))}
                    type="number"
                    value={currentTimerSeconds}
                  />
                ) : null}

                {/* RoundRobin speaker */}
                {currentDay.phase === 'public' && currentDay.publicMode === 'roundRobin' ? (
                  <p className="storyteller-center__speaker">#{currentDay.currentSpeakerSeat ?? '—'}</p>
                ) : null}

                {/* Nomination status */}
                {currentDay.phase === 'nomination' && currentDay.nominationStep === 'waitingForNomination' ? (
                  <p className="storyteller-center__status">
                    {currentDay.voteDraft.actor ? `${text.actor}: #${currentDay.voteDraft.actor} → ${text.pickNominee}` : text.waitingForNomination}
                  </p>
                ) : null}

                {currentDay.phase === 'nomination' && (currentDay.nominationStep === 'actorSpeech' || currentDay.nominationStep === 'targetSpeech') ? (
                  <div className="storyteller-center__vote-mini">
                    <span>#{currentDay.voteDraft.actor ?? '?'} → #{currentDay.voteDraft.target ?? '?'}</span>
                    <span className="storyteller-center__phase-label">
                      {currentDay.nominationStep === 'actorSpeech' ? text.actorSpeaking : text.targetSpeaking}
                    </span>
                  </div>
                ) : null}

                {currentDay.phase === 'nomination' && currentDay.nominationStep === 'nominationDecision' ? (
                  <div className="storyteller-center__vote-mini">
                    <span>#{currentDay.voteDraft.actor ?? '?'} → #{currentDay.voteDraft.target ?? '?'}</span>
                    {!reviewMode ? (
                      <div className="storyteller-center__timer-controls">
                        <button className="print-button" onClick={confirmNomination} type="button">{text.nominationSucceed}</button>
                        <button className="secondary-button" onClick={rejectNomination} type="button">{text.nominationFailed}</button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {currentDay.phase === 'nomination' && currentDay.nominationStep === 'readyToVote' ? (
                  <div className="storyteller-center__vote-mini">
                    <span>#{currentDay.voteDraft.actor ?? '?'} → #{currentDay.voteDraft.target ?? '?'}</span>
                    {!reviewMode ? (
                      <div className="storyteller-center__timer-controls">
                        <button className="print-button" onClick={startVoting} type="button">{text.startVoting}</button>
                        <button className="secondary-button" onClick={skipVoting} type="button">{text.skipVoting}</button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {currentDay.phase === 'nomination' && (currentDay.nominationStep === 'voting' || currentDay.nominationStep === 'votingDone') ? (
                  <div className="storyteller-center__vote-mini">
                    <span>#{currentDay.voteDraft.actor ?? '?'} → #{currentDay.voteDraft.target ?? '?'}</span>
                    {currentVoterSeat ? <span>{text.currentVoter}: #{currentVoterSeat}</span> : null}
                    <span className="storyteller-center__vote-count">
                      {currentDay.votingState ? Object.values(currentDay.votingState.votes).filter(Boolean).length : currentDay.voteDraft.voters.length}
                      <small>/{requiredVotes}</small>
                    </span>
                    {isVotingComplete ? (
                      <span className={draftPassed ? 'storyteller-pass' : 'storyteller-fail'}>
                        {draftPassed ? text.pass : text.fail}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {/* Timer controls */}
                {hasTimer && !reviewMode ? (
                  <div className="storyteller-center__timer-controls">
                    <button
                      className={`storyteller-center__ctrl-btn${isTimerRunning ? ' storyteller-center__ctrl-btn--active' : ''}`}
                      onClick={() => setIsTimerRunning((c) => !c)}
                      title={text.start}
                      type="button"
                    >
                      {isTimerRunning ? '⏸' : '▶'}
                    </button>
                    <button className="storyteller-center__ctrl-btn" onClick={() => { updateCurrentDay(syncDayTimers); setIsTimerRunning(false) }} title={text.resetTimer} type="button">↺</button>
                    <button className="storyteller-center__ctrl-btn" onClick={() => setCurrentTimer(0)} title={text.endNow} type="button">■</button>
                  </div>
                ) : null}

                {/* RoundRobin speaker nav */}
                {currentDay.phase === 'public' && currentDay.publicMode === 'roundRobin' && !reviewMode ? (
                  <div className="storyteller-center__speaker-nav">
                    <button className="secondary-button secondary-button--small" onClick={() => setPickerMode('speaker')} type="button">{text.chooseSpeaker}</button>
                    <button className="secondary-button secondary-button--small" onClick={() => {
                      const all = currentDay.seats.map((s) => s.seat)
                      const r = all[Math.floor(Math.random() * Math.max(all.length, 1))]
                      updateCurrentDay((d) => ({ ...d, currentSpeakerSeat: r ?? 1, roundRobinSpokenSeats: [] }))
                    }} type="button">{text.randomSpeaker}</button>
                    <button className="secondary-button secondary-button--small" onClick={moveToNextSpeaker} type="button">{text.nextSpeaker}</button>
                  </div>
                ) : null}

                {/* Public: nomination button */}
                {currentDay.phase === 'public' && currentDay.publicMode === 'free' && !reviewMode ? (
                  canNominate ? (
                    <button className="print-button storyteller-start-vote" onClick={enterNomination} type="button">{text.startNomination}</button>
                  ) : (
                    <p className="storyteller-center__status storyteller-center__status--muted">
                      {text.nominationGate}: {Math.ceil(secondsUntilNomination / 60)}:{String(secondsUntilNomination % 60).padStart(2, '0')}
                    </p>
                  )
                ) : null}

                {/* Nomination: record vote / continue */}
                {isVotingComplete && !reviewMode ? (
                  <div className="storyteller-center__timer-controls">
                    <button className="print-button" onClick={recordVote} type="button">{text.recordVote}</button>
                  </div>
                ) : null}

                {/* Back to public */}
                {currentDay.phase === 'nomination' && (currentDay.nominationStep === 'waitingForNomination' || isVotingComplete) && !reviewMode ? (
                  <button className="secondary-button secondary-button--small" onClick={resumePublic} type="button">{text.continuePublic}</button>
                ) : null}
              </section>

              {/* ── Seat cards ── */}
              {currentDay.seats.map((seat, index) => {
                const angle = (index / currentDay.seats.length) * Math.PI * 2 - Math.PI / 2
                const x = Math.cos(angle)
                const y = Math.sin(angle)
                const tags = [!seat.alive ? text.aliveTag : '', seat.isExecuted ? text.executedTag : '', seat.isTraveler ? text.traveler : '', seat.hasNoVote ? text.noVoteTag : '', ...seat.customTags].filter(Boolean)
                const isSpoken = currentDay.roundRobinSpokenSeats.includes(seat.seat)
                const isVoteActor = currentDay.voteDraft.actor === seat.seat
                const isVoteTarget = currentDay.voteDraft.target === seat.seat
                const isSkillActor = skillOverlay?.draft.actor === seat.seat
                const isSkillTarget = skillOverlay?.draft.targets.includes(seat.seat) ?? false
                const isCurrentVoter = currentVoterSeat === seat.seat
                const hasVoted = currentDay.votingState?.votes[seat.seat] !== undefined
                const votedYes = currentDay.votingState?.votes[seat.seat] === true

                return (
                  <article
                    className={[
                      'storyteller-seat',
                      !seat.alive ? 'storyteller-seat--dead' : '',
                      seat.isExecuted ? 'storyteller-seat--executed' : '',
                      seat.isTraveler ? 'storyteller-seat--traveler' : '',
                      selectedSeat?.seat === seat.seat ? 'storyteller-seat--speaker' : '',
                      isSpoken ? 'storyteller-seat--spoken' : '',
                      isVoteActor || isSkillActor ? 'storyteller-seat--actor' : '',
                      isVoteTarget ? 'storyteller-seat--target' : '',
                      isSkillTarget ? 'storyteller-seat--skill-target' : '',
                      skillOverlay && !isSkillActor && !isSkillTarget ? 'storyteller-seat--skill-pickable' : '',
                      isCurrentVoter ? 'storyteller-seat--voting-active' : '',
                      hasVoted && votedYes ? 'storyteller-seat--voter' : '',
                    ].filter(Boolean).join(' ')}
                    key={seat.seat}
                    style={{ left: `${50 + x * 44}%`, top: `${50 + y * 44}%` } as CSSProperties}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button className="storyteller-seat__surface" onClick={() => handleSeatClick(seat.seat)} type="button">
                      <div className="storyteller-seat__topline">
                        <span className="storyteller-seat__number">#{seat.seat}</span>
                        {hasVoted ? <span className={`storyteller-seat__vote-mark${votedYes ? '' : ' storyteller-seat__vote-mark--no'}`}>{votedYes ? '✓' : '✗'}</span> : null}
                      </div>
                      <input
                        aria-label={`Seat ${seat.seat}`}
                        disabled={reviewMode}
                        onChange={(e) => updateSeat(seat.seat, (s) => ({ ...s, name: e.target.value }))}
                        onBlur={(e) => {
                          const val = e.target.value.trim()
                          if (val && !val.match(/^Player \d+$/) && !val.match(/^Traveler \d+$/) && !playerNamePool.includes(val)) {
                            setPlayerNamePool((cur) => [...cur, val])
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        type="text"
                        value={seat.name}
                      />
                    </button>

                    {/* Vote button during voting */}
                    {currentDay.nominationStep === 'voting' && isCurrentVoter && !hasVoted && !reviewMode ? (
                      <button className="storyteller-seat__vote-btn" onClick={() => handleVoteYes(seat.seat)} type="button">{text.voteYes}</button>
                    ) : null}

                    {tags.length ? (
                      <div className="storyteller-seat__tag-list">
                        {tags.map((tag) => (
                          <span
                            className="storyteller-seat__pill"
                            key={`${seat.seat}-${tag}`}
                            onContextMenu={(e) => { if (!seat.customTags.includes(tag) || reviewMode) return; e.preventDefault(); removeSeatTag(seat.seat, tag) }}
                            title={seat.customTags.includes(tag) ? 'Right click to remove' : undefined}
                          >{tag}</span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
            <p className="storyteller-panel__hint">{text.seatHint}</p>
          </section>

          {/* Right: Console with 4 sections */}
          <aside className="storyteller-control-dock">
            <section className="storyteller-workcard storyteller-console storyteller-console-sections">

              {/* ── Section 1: Game ── */}
              <div className="storyteller-console-section">
                <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('game')} type="button">
                  <span>{text.gameSection}</span>
                  <span>{activeConsoleSection === 'game' ? '▼' : '▶'}</span>
                </button>
                {activeConsoleSection === 'game' ? (
                  <div className="storyteller-console-section__body">
                    {activeScriptTitle ? <span className="storyteller-script-badge">{text.currentScript}: {activeScriptTitle}</span> : null}

                    <label className="editor-field storyteller-script-select">
                      <span>{text.script}</span>
                      <select disabled={reviewMode} onChange={(e) => onSelectScript?.(e.target.value)} value={activeScriptSlug ?? scriptOptions[0]?.slug ?? ''}>
                        {scriptOptions.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
                      </select>
                    </label>

                    <div className="storyteller-chip-row">
                      {!reviewMode ? <button className="print-button" onClick={openNewGamePanel} type="button">{text.newGame}</button> : null}
                      {!reviewMode ? <button className="secondary-button" onClick={openEndGamePanel} type="button">{text.endGame}</button> : null}
                    </div>

                    <div className="storyteller-chip-row">
                      <button className="secondary-button" onClick={() => setShowSettings((c) => !c)} type="button">{showSettings ? text.closeSettings : text.openSettings}</button>
                      <button className={`secondary-button${reviewMode ? ' tab-button--active' : ''}`} onClick={() => setReviewMode((c) => !c)} type="button">
                        {reviewMode ? text.reviewModeLabel : text.editMode}
                      </button>
                      <button className="secondary-button" onClick={exportGameJson} type="button">{text.exportJson}</button>
                    </div>

                    {!reviewMode ? (
                      <div className="storyteller-chip-row">
                        <button className="secondary-button" onClick={() => setDialogState({ kind: 'restartGame' })} type="button">{text.restartGame}</button>
                      </div>
                    ) : null}

                    {/* Settings */}
                    {showSettings ? (
                      <div className="storyteller-console__section">
                        <span className="storyteller-console__label">{text.settings}</span>
                        <div className="storyteller-settings-grid">
                          <label className="editor-field"><span>{text.privateDefault}</span><input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, privateSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.privateSeconds} /></label>
                          <label className="editor-field"><span>{text.publicFreeDefault}</span><input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, publicFreeSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.publicFreeSeconds} /></label>
                          <label className="editor-field"><span>{text.publicRoundRobinDefault}</span><input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, publicRoundRobinSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.publicRoundRobinSeconds} /></label>
                          <label className="editor-field"><span>{text.nominationDelayDefault}</span><input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, nominationDelayMinutes: Number(e.target.value) }))} type="number" value={timerDefaults.nominationDelayMinutes} /></label>
                          <label className="editor-field"><span>{text.nominationWaitDefault}</span><input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, nominationWaitSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.nominationWaitSeconds} /></label>
                          <label className="editor-field"><span>{text.actorSpeechDefault}</span><input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, nominationActorSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.nominationActorSeconds} /></label>
                          <label className="editor-field"><span>{text.targetSpeechDefault}</span><input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, nominationTargetSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.nominationTargetSeconds} /></label>
                          <label className="editor-field"><span>{text.voteDefault}</span><input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, nominationVoteSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.nominationVoteSeconds} /></label>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* ── Section 2: Day ── */}
              <div className="storyteller-console-section">
                <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('day')} type="button">
                  <span>{text.daySection}</span>
                  <span>{activeConsoleSection === 'day' ? '▼' : '▶'}</span>
                </button>
                {activeConsoleSection === 'day' ? (
                  <div className="storyteller-console-section__body">
                    {/* Day nav */}
                    <div className="storyteller-day-nav">
                      <button className="secondary-button" disabled={reviewMode} onClick={goToPreviousDay} type="button">Day -1</button>
                      <select className="storyteller-day-select" onChange={(e) => setSelectedDayId(e.target.value)} value={currentDay.id}>
                        {days.map((d) => <option key={d.id} value={d.id}>Day {d.day}</option>)}
                      </select>
                      <button className="secondary-button" disabled={reviewMode} onClick={goToNextDay} type="button">Day +1</button>
                    </div>

                    {/* Phase tabs */}
                    <div className="storyteller-main-tabs">
                      {(['private', 'public', 'nomination'] as Phase[]).map((p) => (
                        <button
                          className={`tab-button${currentDay.phase === p ? ' tab-button--active' : ''}`}
                          disabled={reviewMode}
                          key={p}
                          onClick={() => setPhase(p)}
                          type="button"
                        >
                          {p === 'private' ? text.privateChat : p === 'public' ? text.publicChat : text.nomination}
                        </button>
                      ))}
                    </div>

                    {/* Add Traveler */}
                    {!reviewMode ? (
                      <div className="storyteller-chip-row">
                        <button className="secondary-button" onClick={addTravelerSeat} type="button">{text.addTraveler}</button>
                      </div>
                    ) : null}

                    {/* Nomination controls */}
                    {currentDay.phase === 'nomination' ? (
                      <div className="storyteller-console__section">
                        <span className="storyteller-console__label">{text.nomination}</span>
                        {!reviewMode ? (
                          <div className="storyteller-chip-row">
                            <button className="secondary-button" onClick={() => setPickerMode('nominator')} type="button">{text.pickNominator}</button>
                            <button className="secondary-button" onClick={() => setPickerMode('nominee')} type="button">{text.pickNominee}</button>
                          </div>
                        ) : null}
                        <div className="storyteller-vote-summary">
                          <div><span>{text.actor}</span><strong>{currentDay.voteDraft.actor ? `#${currentDay.voteDraft.actor}` : '—'}</strong></div>
                          <div><span>{text.target}</span><strong>{currentDay.voteDraft.target ? `#${currentDay.voteDraft.target}` : '—'}</strong></div>
                          <div><span>{text.requiredVotes}</span><strong>{requiredVotes}</strong></div>
                          <div><span>{text.voters}</span><strong>{votingYesCount}</strong></div>
                        </div>
                        {!reviewMode ? (
                          <label className="editor-field">
                            <span>{text.note}</span>
                            <input onChange={(e) => updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, note: e.target.value } }))} type="text" value={currentDay.voteDraft.note} />
                          </label>
                        ) : null}
                        {isVotingComplete && !reviewMode ? (
                          <div className="storyteller-chip-row">
                            <button className="secondary-button" onClick={() => setDialogState({ kind: 'voteResult', nextValue: true, systemValue: draftPassedBySystem })} type="button">{text.systemOverridePass}</button>
                            <button className="secondary-button" onClick={() => setDialogState({ kind: 'voteResult', nextValue: false, systemValue: draftPassedBySystem })} type="button">{text.systemOverrideFail}</button>
                            <button className="secondary-button" onClick={() => updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, manualPassed: null } }))} type="button">{text.clearOverride}</button>
                          </div>
                        ) : null}
                        {!reviewMode ? (
                          <div className="storyteller-chip-row">
                            <button className="secondary-button" onClick={() => { updateCurrentDay((d) => ({ ...d, nominationStep: 'waitingForNomination', nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteDraft: createDefaultVoteDraft(), votingState: null })); setPickerMode('nominator') }} type="button">{text.clear}</button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Game actions */}
                    {!reviewMode ? (
                      <div className="storyteller-console__section">
                        <span className="storyteller-console__label">{text.gameActions}</span>
                        <div className="storyteller-chip-row">
                          {!skillOverlay ? <button className="print-button" onClick={openSkillOverlay} type="button">{text.useSkill}</button> : null}
                        </div>
                      </div>
                    ) : null}

                    {/* Skill panel */}
                    {skillOverlay && !reviewMode ? (
                      <div className="storyteller-console__section storyteller-skill-panel">
                        <div className="storyteller-skill-panel__header">
                          <span className="storyteller-console__label">{text.useSkill}</span>
                          <span className="storyteller-center__status">{skillOverlay.phaseContext}</span>
                        </div>

                        <div className="storyteller-chip-row">
                          <button className={`secondary-button${pickerMode === 'skillActor' ? ' storyteller-picker-active' : ''}`} onClick={() => setPickerMode('skillActor')} type="button">
                            {text.skillActor}: {skillOverlay.draft.actor ? `#${skillOverlay.draft.actor}` : '—'}
                          </button>
                          <button className={`secondary-button${pickerMode === 'skillTarget' ? ' storyteller-picker-active' : ''}`} onClick={() => setPickerMode('skillTarget')} type="button">
                            {text.skillTarget}: {skillOverlay.draft.targets.length ? skillOverlay.draft.targets.map((t) => `#${t}`).join(', ') : '—'}
                          </button>
                        </div>

                        <p className="storyteller-skill-panel__hint">
                          {pickerMode === 'skillActor' ? (language === 'zh' ? '← 点击座位选择技能发动者' : '← Click a seat to pick skill user') : null}
                          {pickerMode === 'skillTarget' ? (language === 'zh' ? '← 点击座位选择技能目标（可多选）' : '← Click seats to pick targets (multi-select)') : null}
                        </p>

                        <div className="editor-field">
                          <span className="storyteller-skill-panel__field-label">{text.skillRole}</span>
                          <div className="storyteller-skill-overlay__role-list">
                            {currentScriptCharacters.map((c) => {
                              const icon = getIconForCharacter(c)
                              const name = getDisplayName(c, language)
                              const isSelected = skillOverlay.draft.roleId === c
                              return (
                                <button
                                  className={`storyteller-skill-overlay__role-chip${isSelected ? ' storyteller-skill-overlay__role-chip--active' : ''}`}
                                  key={c}
                                  onClick={() => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, roleId: isSelected ? '' : c } } : p)}
                                  type="button"
                                >
                                  {icon ? <img alt="" className="storyteller-skill-overlay__role-icon" src={icon as string} /> : null}
                                  <span>{name}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <label className="editor-field">
                          <span>{text.statement}</span>
                          <input onChange={(e) => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, statement: e.target.value } } : p)} type="text" value={skillOverlay.draft.statement} />
                        </label>

                        <label className="editor-field">
                          <span>{text.note}</span>
                          <input onChange={(e) => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, note: e.target.value } } : p)} type="text" value={skillOverlay.draft.note} />
                        </label>

                        <div className="storyteller-chip-row">
                          <button className={`secondary-button${skillOverlay.draft.result === 'success' ? ' tab-button--active' : ''}`} onClick={() => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, result: 'success' } } : p)} type="button">{text.success}</button>
                          <button className={`secondary-button${skillOverlay.draft.result === 'failure' ? ' tab-button--active' : ''}`} onClick={() => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, result: 'failure' } } : p)} type="button">{text.failure}</button>
                        </div>

                        {/* Per-target notes */}
                        {skillOverlay.draft.targets.map((t) => (
                          <label className="editor-field" key={t}>
                            <span>#{t} {text.targetNote}</span>
                            <input
                              onChange={(e) => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, targetNotes: { ...p.draft.targetNotes, [t]: e.target.value } } } : p)}
                              type="text"
                              value={skillOverlay.draft.targetNotes[t] ?? ''}
                            />
                          </label>
                        ))}

                        <div className="storyteller-chip-row">
                          <button className="print-button" onClick={() => closeSkillOverlay(true)} type="button">{text.saveSkill}</button>
                          <button className="secondary-button" onClick={() => closeSkillOverlay(false)} type="button">{text.cancelSkill}</button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* ── Section 3: Player ── */}
              <div className="storyteller-console-section">
                <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('player')} type="button">
                  <span>{text.playerSection}</span>
                  <span>{activeConsoleSection === 'player' ? '▼' : '▶'}</span>
                </button>
                {activeConsoleSection === 'player' ? (
                  <div className="storyteller-console-section__body">
                    {/* Player count slider */}
                    <label className="editor-field storyteller-count">
                      <span>{text.playerCount}</span>
                      <input disabled={reviewMode} max="15" min="5" onChange={(e) => updatePlayerCount(Number(e.target.value))} type="range" value={currentDay.seats.length} />
                      <strong>{currentDay.seats.length}</strong>
                    </label>

                    {/* Player name pool */}
                    <div className="storyteller-console__section">
                      <span className="storyteller-console__label">{text.playerPool}</span>
                      <div className="storyteller-player-pool">
                        {playerNamePool.map((name, i) => {
                          const isUsed = currentDay.seats.some((s) => s.name === name)
                          return (
                            <span
                              className={`storyteller-player-pool__chip${isUsed ? ' storyteller-player-pool__chip--used' : ''}`}
                              key={`${name}-${i}`}
                              onClick={() => {
                                if (reviewMode) return
                                // Assign to first seat with default name
                                const seat = currentDay.seats.find((s) => s.name.startsWith('Player '))
                                if (seat) updateSeat(seat.seat, (s) => ({ ...s, name }))
                              }}
                              title={text.assignName}
                            >{name}</span>
                          )
                        })}
                      </div>
                      {!reviewMode ? (
                        <div className="storyteller-chip-row">
                          <button className="secondary-button secondary-button--small" onClick={() => setPlayerNamePool(language === 'zh' ? [...FAKE_NAMES_ZH] : [...FAKE_NAMES])} type="button">{text.loadFakeNames}</button>
                          <button className="secondary-button secondary-button--small" onClick={resetSeatNames} type="button">{text.resetNames}</button>
                          <button className="secondary-button secondary-button--small" onClick={() => setPlayerNamePool([])} type="button">{text.clear}</button>
                        </div>
                      ) : null}
                    </div>

                    {/* Selected player editor (moved from seat card popup) */}
                    {selectedSeat ? (
                      <div className="storyteller-console__section">
                        <div className="storyteller-seat-editor">
                          <div className="storyteller-seat-editor__section">
                            <strong>{text.selectedPlayer}</strong>
                            <span>#{selectedSeat.seat} {selectedSeat.name}</span>
                          </div>
                          {!reviewMode ? (
                            <div className="storyteller-seat-editor__section">
                              <div className="storyteller-chip-row">
                                <button className={`secondary-button secondary-button--small${!selectedSeat.alive ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, alive: !s.alive }))} type="button">{text.aliveTag}</button>
                                <button className={`secondary-button secondary-button--small${selectedSeat.isExecuted ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, isExecuted: !s.isExecuted }))} type="button">{text.executedTag}</button>
                                <button className={`secondary-button secondary-button--small${selectedSeat.isTraveler ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, isTraveler: !s.isTraveler }))} type="button">{text.traveler}</button>
                                <button className={`secondary-button secondary-button--small${selectedSeat.hasNoVote ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, hasNoVote: !s.hasNoVote }))} type="button">{text.noVoteTag}</button>
                              </div>
                            </div>
                          ) : null}
                          {selectedSeatTags.length ? (
                            <div className="storyteller-chip-row">
                              {selectedSeatTags.map((tag) => <span className="storyteller-seat__pill" key={`${selectedSeat.seat}-${tag}`}>{tag}</span>)}
                            </div>
                          ) : null}
                          {!reviewMode ? (
                            <div className="storyteller-seat-editor__section">
                              <label className="editor-field">
                                <span>{text.addTag}</span>
                                <div className="storyteller-seat-editor__add">
                                  <input onChange={(e) => setSeatTagDrafts((c) => ({ ...c, [selectedSeat.seat]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(selectedSeat.seat) } }} placeholder={text.addTag} type="text" value={seatTagDrafts[selectedSeat.seat] ?? ''} />
                                  <button className="secondary-button secondary-button--small" onClick={() => addCustomTag(selectedSeat.seat)} type="button">+</button>
                                </div>
                              </label>
                              {customTagPool.length ? (
                                <>
                                  <div className="storyteller-console__pool-header">
                                    <span className="storyteller-console__label">{text.tagPool}</span>
                                    <button className="secondary-button secondary-button--small" onClick={clearUnusedCustomTags} type="button">{text.clearUnusedTags}</button>
                                  </div>
                                  <div className="storyteller-chip-row">
                                    {customTagPool.map((tag) => (
                                      <button className={`secondary-button secondary-button--small${selectedSeat.customTags.includes(tag) ? ' tab-button--active' : ''}`} key={`pool-${tag}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, customTags: s.customTags.includes(tag) ? s.customTags.filter((v) => v !== tag) : [...s.customTags, tag] }))} type="button">{tag}</button>
                                    ))}
                                  </div>
                                </>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* ── Section 4: BGM ── */}
              <div className="storyteller-console-section">
                <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('bgm')} type="button">
                  <span>{text.bgmSection}</span>
                  <span>{activeConsoleSection === 'bgm' ? '▼' : '▶'}</span>
                </button>
                {activeConsoleSection === 'bgm' ? (
                  <div className="storyteller-console-section__body">
                    <div className="storyteller-audio-player">
                      <select className="storyteller-day-select" onChange={(e) => setAudioTrackIndex(Number(e.target.value))} value={audioTrackIndex}>
                        {AUDIO_TRACKS.map((t, i) => <option key={t.src} value={i}>{t.name}</option>)}
                      </select>
                      <div className="storyteller-chip-row">
                        <button className={`secondary-button${audioPlaying ? ' tab-button--active' : ''}`} onClick={() => setAudioPlaying((c) => !c)} type="button">{audioPlaying ? text.pause : text.play}</button>
                        <button className={`secondary-button${audioLoopMode === 'single' ? ' tab-button--active' : ''}`} onClick={() => setAudioLoopMode('single')} type="button">{text.singleLoop}</button>
                        <button className={`secondary-button${audioLoopMode === 'all' ? ' tab-button--active' : ''}`} onClick={() => setAudioLoopMode('all')} type="button">{text.loopAll}</button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </aside>
        </section>


        {/* Completed Games */}
        <section className="storyteller-workgrid">
          <section className="storyteller-workcard">
            <div className="section-heading"><h2>{text.completedGames}</h2></div>
            <div className="storyteller-history">
              {gameRecords.length ? gameRecords.map((r) => (
                <article className="storyteller-history__item" key={r.id}>
                  <div className="storyteller-history__top">
                    <strong>{r.scriptTitle ?? 'BOTC'}</strong>
                    <span>{new Date(r.endedAt).toLocaleString()}</span>
                  </div>
                  {r.winner ? <p>{text.winner}: {r.winner === 'evil' ? text.evil : text.good}</p> : null}
                  <p>{r.days.map((d) => `D${d.day}`).join(', ')}</p>
                </article>
              )) : <p className="storyteller-panel__hint">{text.noCompletedGames}</p>}
            </div>
          </section>
        </section>
      </section>

      {/* New Game Modal */}
      {newGamePanel ? (
        <div className="storyteller-modal" role="dialog" aria-modal="true">
          <div className="storyteller-modal__card storyteller-new-game-modal">
            <h3>{text.startNewGame}</h3>

            <label className="editor-field">
              <span>{text.playerCount}</span>
              <input max="15" min="5" onChange={(e) => {
                const count = Number(e.target.value)
                setNewGamePanel((c) => {
                  if (!c) return c
                  // Keep existing seat names, remove ones beyond new count
                  const seatNames: Record<number, string> = {}
                  for (let i = 1; i <= count; i++) {
                    if (c.seatNames[i]) seatNames[i] = c.seatNames[i]
                  }
                  return { ...c, playerCount: count, assignments: [], seatNames }
                })
              }} type="range" value={newGamePanel.playerCount} />
              <strong>{newGamePanel.playerCount}</strong>
            </label>

            <label className="editor-field storyteller-script-select">
              <span>{text.script}</span>
              <select onChange={(e) => setNewGamePanel((c) => c ? { ...c, scriptSlug: e.target.value, assignments: [] } : c)} value={newGamePanel.scriptSlug}>
                {scriptOptions.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
              </select>
            </label>

            {/* Seat name assignment */}
            {playerNamePool.length > 0 ? (
              <div className="storyteller-console__section">
                <span className="storyteller-console__label">{text.seatAssignment}</span>
                <p className="storyteller-panel__hint" style={{ margin: '0 0 0.4rem' }}>{text.clickToAssign}</p>
                <div className="storyteller-player-pool">
                  {playerNamePool.map((name, i) => {
                    const assignedSeat = Object.entries(newGamePanel.seatNames).find(([, n]) => n === name)?.[0]
                    return (
                      <span
                        className={`storyteller-player-pool__chip${assignedSeat ? ' storyteller-player-pool__chip--used' : ''}`}
                        key={`${name}-${i}`}
                        onClick={() => {
                          if (assignedSeat) {
                            // Remove from seat
                            setNewGamePanel((c) => {
                              if (!c) return c
                              const seatNames = { ...c.seatNames }
                              delete seatNames[Number(assignedSeat)]
                              return { ...c, seatNames }
                            })
                          } else {
                            // Assign to first empty seat
                            setNewGamePanel((c) => {
                              if (!c) return c
                              const seatNames = { ...c.seatNames }
                              for (let s = 1; s <= c.playerCount; s++) {
                                if (!seatNames[s]) { seatNames[s] = name; break }
                              }
                              return { ...c, seatNames }
                            })
                          }
                        }}
                        title={assignedSeat ? `#${assignedSeat} — ${text.removeFromSeat}` : text.assignName}
                      >{name}{assignedSeat ? ` (#${assignedSeat})` : ''}</span>
                    )
                  })}
                </div>
                <div className="storyteller-new-game-seats">
                  {Array.from({ length: newGamePanel.playerCount }, (_, i) => i + 1).map((seatNum) => (
                    <div className="storyteller-new-game-seats__row" key={seatNum}>
                      <span>#{seatNum}</span>
                      <input
                        onChange={(e) => setNewGamePanel((c) => c ? { ...c, seatNames: { ...c.seatNames, [seatNum]: e.target.value } } : c)}
                        onBlur={(e) => {
                          const val = e.target.value.trim()
                          if (val && !val.match(/^Player \d+$/) && !playerNamePool.includes(val)) {
                            setPlayerNamePool((cur) => [...cur, val])
                          }
                        }}
                        placeholder={`Player ${seatNum}`}
                        type="text"
                        value={newGamePanel.seatNames[seatNum] ?? ''}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Distribution table */}
            {CHARACTER_DISTRIBUTION[newGamePanel.playerCount] ? (
              <div className="storyteller-distribution-grid">
                <span className="storyteller-console__label">{text.distribution}</span>
                <div className="storyteller-distribution-grid__row">
                  <span>{text.townsfolk}: <strong>{CHARACTER_DISTRIBUTION[newGamePanel.playerCount].townsfolk}</strong></span>
                  <span>{text.outsider}: <strong>{CHARACTER_DISTRIBUTION[newGamePanel.playerCount].outsider}</strong></span>
                  <span>{text.minion}: <strong>{CHARACTER_DISTRIBUTION[newGamePanel.playerCount].minion}</strong></span>
                  <span>{text.demon}: <strong>{CHARACTER_DISTRIBUTION[newGamePanel.playerCount].demon}</strong></span>
                </div>
              </div>
            ) : null}

            {/* Random assign checkbox */}
            <div className="storyteller-chip-row">
              <button
                className={`secondary-button${newGamePanel.randomAssign ? ' tab-button--active' : ''}`}
                onClick={() => {
                  setNewGamePanel((c) => {
                    if (!c) return c
                    if (!c.randomAssign) {
                      const assigns = randomAssignCharacters(c)
                      return { ...c, randomAssign: true, assignments: assigns }
                    }
                    return { ...c, randomAssign: false, assignments: [] }
                  })
                }}
                type="button"
              >{text.randomAssign}</button>
              {newGamePanel.randomAssign ? (
                <button
                  className="secondary-button"
                  onClick={() => setNewGamePanel((c) => c ? { ...c, showAssignments: !c.showAssignments } : c)}
                  type="button"
                >{newGamePanel.showAssignments ? text.hideAssign : text.showAssign}</button>
              ) : null}
            </div>

            {/* Assignments display */}
            {newGamePanel.randomAssign && newGamePanel.showAssignments && newGamePanel.assignments.length ? (
              <div className="storyteller-history">
                {newGamePanel.assignments.map((a) => {
                  const charName = a.characterId ? getDisplayName(a.characterId, language) : '—'
                  return (
                    <div className="storyteller-history__item" key={a.seat}>
                      <div className="storyteller-history__top">
                        <strong>#{a.seat}</strong>
                        <span>{charName} ({a.team})</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}

            <div className="storyteller-chip-row">
              <button className="secondary-button" onClick={() => setNewGamePanel(null)} type="button">{text.cancelNewGame}</button>
              <button className="print-button" onClick={startNewGame} type="button">{text.startNewGame}</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* End Game Modal */}
      {endGameResult ? (
        <div className="storyteller-modal" role="dialog" aria-modal="true">
          <div className="storyteller-modal__card storyteller-end-game-modal">
            <h3>{text.endGame}</h3>

            <div className="storyteller-chip-row">
              <span className="storyteller-console__label">{text.winner}:</span>
              <button
                className={`secondary-button${endGameResult.winner === 'evil' ? ' tab-button--active' : ''}`}
                onClick={() => setEndGameResult((c) => c ? { ...c, winner: 'evil' } : c)}
                type="button"
              >{text.evil}</button>
              <button
                className={`secondary-button${endGameResult.winner === 'good' ? ' tab-button--active' : ''}`}
                onClick={() => setEndGameResult((c) => c ? { ...c, winner: 'good' } : c)}
                type="button"
              >{text.good}</button>
            </div>

            <div className="storyteller-history">
              {currentDay.seats.map((s) => (
                <div className="storyteller-history__item" key={s.seat}>
                  <div className="storyteller-history__top">
                    <strong>#{s.seat} {s.name}</strong>
                    <select
                      onChange={(e) => setEndGameResult((c) => c ? { ...c, playerTeams: { ...c.playerTeams, [s.seat]: e.target.value } } : c)}
                      value={endGameResult.playerTeams[s.seat] ?? 'good'}
                    >
                      <option value="good">{text.good}</option>
                      <option value="evil">{text.evil}</option>
                    </select>
                  </div>
                  <input
                    className="storyteller-end-game-modal__note"
                    onChange={(e) => setEndGameResult((c) => c ? { ...c, playerNotes: { ...c.playerNotes, [s.seat]: e.target.value } } : c)}
                    placeholder={text.playerNotes}
                    type="text"
                    value={endGameResult.playerNotes[s.seat] ?? ''}
                  />
                </div>
              ))}
            </div>

            <div className="storyteller-chip-row">
              <button className="secondary-button" onClick={() => setEndGameResult(null)} type="button">{text.cancel}</button>
              <button className="print-button" onClick={confirmEndGame} type="button">{text.confirmEnd}</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirmation dialog */}
      {dialogState ? (
        <div className="storyteller-modal" role="dialog" aria-modal="true">
          <div className="storyteller-modal__card">
            <h3>{dialogTitle}</h3>
            <div className="storyteller-chip-row">
              <button className="secondary-button" onClick={() => setDialogState(null)} type="button">{text.cancel}</button>
              <button className="print-button" onClick={confirmDialog} type="button">{text.confirm}</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Hidden audio element */}
      <audio ref={audioRef} />
    </section>
  )
}
