import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { characterById, getDisplayName, getIconForCharacter } from '../catalog'
import type { Language, Team } from '../types'

// ── Types ──────────────────────────────────────────────────────

type Phase = 'night' | 'private' | 'public' | 'nomination'
type PublicMode = 'free' | 'roundRobin'
type NominationStep =
  | 'waitingForNomination'
  | 'nominationDecision'
  | 'actorSpeech'
  | 'readyForTargetSpeech'
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

type ConsoleSection = 'game' | 'day' | 'player' | 'settings' | 'tags'

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
  noVoters: number[]
  note: string
  manualPassed: boolean | null
  nominationResult: 'succeed' | 'fail'
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
  failed?: boolean
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

const INITIAL_AUDIO_TRACKS: AudioTrack[] = [
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
  return { actor: null, target: null, voters: [], noVoters: [], note: '', manualPassed: null, nominationResult: 'succeed' }
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
  const [showLogPanel, setShowLogPanel] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [skillOverlay, setSkillOverlay] = useState<SkillOverlayState | null>(null)
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>(INITIAL_AUDIO_TRACKS)
  const [selectedAudioSrc, setSelectedAudioSrc] = useState<string>(INITIAL_AUDIO_TRACKS[0].src)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [newGamePanel, setNewGamePanel] = useState<NewGameConfig | null>(null)
  const [endGameResult, setEndGameResult] = useState<EndGameResult | null>(null)
  const [logFilter, setLogFilter] = useState<LogFilterState>({ types: new Set(['vote', 'skill', 'event']), dayFilter: 'all', sortAsc: false })
  const [activeConsoleSections, setActiveConsoleSections] = useState<Set<ConsoleSection>>(new Set(['day']))
  const [tagPopoutSeat, setTagPopoutSeat] = useState<number | null>(null)
  const [skillPopoutSeat, setSkillPopoutSeat] = useState<number | null>(null)
  const [skillRoleDropdownOpen, setSkillRoleDropdownOpen] = useState(false)
  const [showNominationSheet, setShowNominationSheet] = useState(false)
  const [showEditPlayersModal, setShowEditPlayersModal] = useState(false)
  const [editPlayersPreset, setEditPlayersPreset] = useState('')
  const [loadTagsPreset, setLoadTagsPreset] = useState('')
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
            settings: '倒计时设置',
            gameActions: '操作',
            nightPhase: '夜晚',
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
            showPanel: '显示面板',
            hidePanel: '隐藏面板',
            aliveCount: '存活',
            totalCount: '总人数',
            highestVote: '最高票数',
            leadingCandidate: '当前最高票',
            todayNominators: '今日提名者',
            todayNominees: '今日被提名',
            quickNomination: '快速提名',
            quickSkill: '使用技能',
            nextDay: '下一天',
            seatAssignment: '座位分配',
            unassigned: '未分配',
            clickToAssign: '点击名字分配到下一个空位',
            loadLocalFile: '加载本地文件',
            removeFromSeat: '移除',
            editPlayers: '编辑玩家',
            loadPreset: '加载预设',
            tagSettings: '标签设置',
            defaultTags: '默认标签',
            loadPredefinedTags: '加载预设标签',
            addTagLabel: '+标签',
            travelersCount: '旅人',
          }
        : {
            eyebrow: 'Storyteller Workbench',
            title: 'Storyteller Companion',
            playerCount: 'Player count',
            script: 'Script',
            currentScript: 'Current Script',
            controlConsole: 'Control Console',
            settings: 'CountDown Settings',
            gameActions: 'Actions',
            nightPhase: 'Night',
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
            showPanel: 'Show Panel',
            hidePanel: 'Hide Panel',
            aliveCount: 'Alive',
            totalCount: 'Total',
            highestVote: 'Highest Votes',
            leadingCandidate: 'Leading',
            todayNominators: "Today's Nominators",
            todayNominees: "Today's Nominees",
            quickNomination: 'Nomination',
            quickSkill: 'Ability',
            nextDay: 'Next Day',
            seatAssignment: 'Seat Assignment',
            unassigned: 'Unassigned',
            clickToAssign: 'Click a name to assign to the next empty seat',
            loadLocalFile: 'Load local file',
            removeFromSeat: 'Remove',
            editPlayers: 'Edit Players',
            loadPreset: 'Load',
            tagSettings: 'Tag Settings',
            defaultTags: 'Default Tags',
            loadPredefinedTags: 'Load predefined tags',
            addTagLabel: '+Tag',
            travelersCount: 'Travelers',
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

  const aliveCount = currentDay.seats.filter((s) => s.alive && !s.isTraveler).length
  const totalCount = currentDay.seats.filter((s) => !s.isTraveler).length
  const highestVoteThisDay = currentDay.voteHistory.length > 0 ? Math.max(...currentDay.voteHistory.map((v) => v.voteCount)) : 0
  const nominatorsThisDay = currentDay.voteHistory.map((v) => v.actor)
  const nomineesThisDay = currentDay.voteHistory.map((v) => v.target)
  const leadingCandidates = highestVoteThisDay > 0
    ? currentDay.voteHistory.filter((v) => v.voteCount === highestVoteThisDay).map((v) => ({ seat: v.target, votes: v.voteCount, name: currentDay.seats.find((s) => s.seat === v.target)?.name ?? `#${v.target}` }))
    : []

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
            return { ...d, privateSeconds: 0, phase: 'public', publicMode: 'free' }
          }
          return { ...d, privateSeconds: d.privateSeconds - 1 }
        }
        // PUBLIC FREE
        if (d.phase === 'public' && d.publicMode === 'free') {
          const nextElapsed = d.publicElapsedSeconds + 1
          if (d.publicFreeSeconds <= 1) {
            return { ...d, publicFreeSeconds: 0, publicElapsedSeconds: nextElapsed, phase: 'nomination', nominationStep: 'waitingForNomination', nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteDraft: createDefaultVoteDraft(), votingState: null }
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
            window.setTimeout(() => setIsTimerRunning(false), 0)
            return { ...d, nominationActorSeconds: 0, nominationStep: 'readyForTargetSpeech' }
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
    if (!selectedAudioSrc) return

    audio.src = selectedAudioSrc
    audio.loop = true
    if (audioPlaying) {
      audio.load()
      audio.play().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAudioSrc])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audioPlaying) audio.play().catch(() => {})
    else audio.pause()
  }, [audioPlaying])

  // ── Functions ──

  function handleLocalFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      const newTrack: AudioTrack = { name: file.name, src: url }
      setAudioTracks((cur) => [...cur, newTrack])
      setSelectedAudioSrc(url)
      setAudioPlaying(true)
    }
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
    updateCurrentDay((d) => ({
      ...d, phase: 'nomination', nominationStep: 'waitingForNomination', nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteDraft: createDefaultVoteDraft(), votingState: null,
    }))
    setShowNominationSheet(true)
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
    updateCurrentDay((d) => {
      const failRecord: VoteRecord | null = (d.voteDraft.actor && d.voteDraft.target) ? {
        id: `${Date.now()}`,
        actor: d.voteDraft.actor,
        target: d.voteDraft.target,
        voters: [],
        voteCount: 0,
        requiredVotes,
        passed: false,
        note: d.voteDraft.note.trim(),
        overridden: false,
        failed: true,
      } : null
      return appendEvent(
        { ...d, nominationStep: 'waitingForNomination', nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteHistory: failRecord ? [failRecord, ...d.voteHistory] : d.voteHistory, voteDraft: createDefaultVoteDraft(), votingState: null },
        'stateChange',
        `提名失败: #${d.voteDraft.actor ?? '?'} → #${d.voteDraft.target ?? '?'}`,
      )
    })
    setPickerMode('nominator')
    setIsTimerRunning(true)
  }

  function confirmTargetSpeech() {
    updateCurrentDay((d) => ({
      ...d,
      nominationStep: 'targetSpeech',
      nominationTargetSeconds: timerDefaults.nominationTargetSeconds,
    }))
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

  function openSeatSkill(seatNumber: number) {
    const ctx = getPhaseContext()
    setSkillOverlay({
      pausedPhase: currentDay.phase,
      wasTimerRunning: isTimerRunning,
      draft: { ...createDefaultSkillDraft(), actor: seatNumber },
      phaseContext: ctx,
    })
    setIsTimerRunning(false)
    setPickerMode('none')
    setSkillPopoutSeat(seatNumber)
    setTagPopoutSeat(null)
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
    setSkillPopoutSeat(null)
    setSkillRoleDropdownOpen(false)
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

  const NIGHT_BGM_SRC = INITIAL_AUDIO_TRACKS.find((t) => t.name === 'Measured Pulse of the Tower')?.src ?? INITIAL_AUDIO_TRACKS[0].src

  function setPhase(phase: Phase) {
    updateCurrentDay((d) => {
      let next = { ...d, phase }
      if (phase === 'nomination') {
        next = { ...next, nominationStep: 'waitingForNomination' as NominationStep, nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteDraft: createDefaultVoteDraft(), votingState: null }
      }
      return next
    })
    setPickerMode('none')
    setIsTimerRunning(false)
    if (phase === 'night') {
      setSelectedAudioSrc(NIGHT_BGM_SRC)
    } else {
      setAudioPlaying(false)
    }
  }

  function startNight() {
    setSelectedAudioSrc(NIGHT_BGM_SRC)
    setAudioPlaying(true)
  }

  function stopNight() {
    setAudioPlaying(false)
    const audio = audioRef.current
    if (audio) { audio.pause(); audio.currentTime = 0 }
  }


  function addPlayerSeat() {
    updateCurrentDay((d) => {
      const regularSeats = d.seats.filter((s) => !s.isTraveler)
      const travelers = d.seats.filter((s) => s.isTraveler)
      const nextNum = regularSeats.length + 1
      const newSeat: StorytellerSeat = { seat: nextNum, name: `Player ${nextNum}`, alive: true, isTraveler: false, isExecuted: false, hasNoVote: false, customTags: [] }
      // Re-number: regular seats first, then travelers
      const reSeated = [...regularSeats, newSeat].map((s, i) => ({ ...s, seat: i + 1 }))
      const travelerReSeated = travelers.map((s, i) => ({ ...s, seat: reSeated.length + i + 1 }))
      return { ...d, seats: [...reSeated, ...travelerReSeated] }
    })
  }

  function removeLastPlayerSeat() {
    updateCurrentDay((d) => {
      const regularSeats = d.seats.filter((s) => !s.isTraveler)
      if (regularSeats.length <= 5) return d
      const travelers = d.seats.filter((s) => s.isTraveler)
      const trimmed = regularSeats.slice(0, regularSeats.length - 1)
      const travelerReSeated = travelers.map((s, i) => ({ ...s, seat: trimmed.length + i + 1 }))
      return { ...d, seats: [...trimmed, ...travelerReSeated] }
    })
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

  function removeLastTraveler() {
    updateCurrentDay((d) => {
      const travelers = d.seats.filter((s) => s.isTraveler)
      if (travelers.length === 0) return d
      const regular = d.seats.filter((s) => !s.isTraveler)
      const trimmedTravelers = travelers.slice(0, travelers.length - 1)
      const reSeated = trimmedTravelers.map((s, i) => ({ ...s, seat: regular.length + i + 1 }))
      return { ...d, seats: [...regular, ...reSeated] }
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
  const hasTimer = currentDay.phase !== 'night' && currentDay.nominationStep !== 'nominationDecision' && currentDay.nominationStep !== 'readyForTargetSpeech' && currentDay.nominationStep !== 'readyToVote' && currentDay.nominationStep !== 'votingDone'

  function toggleConsoleSection(section: ConsoleSection) {
    setActiveConsoleSections((cur) => {
      const next = new Set(cur)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  return (
    <section className={`storyteller-layout${showLogPanel ? ' storyteller-layout--log' : ''}${showRightPanel ? ' storyteller-layout--panel' : ''}`}>

      {/* ── Left side panel: Log ── */}
      <aside className={`storyteller-side-panel storyteller-side-panel--left${showLogPanel ? ' storyteller-side-panel--open' : ''}`}>
        <div className="storyteller-side-panel__header">
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
        <div className="storyteller-side-panel__entries">
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

      {/* ── Main panel ── */}
      <section className="storyteller-panel">

        {/* ── Compact toolbar ── */}
        <div className="storyteller-compact-toolbar">
          <div className="storyteller-compact-toolbar__left">
            <span className="storyteller-compact-count">
              <strong>{aliveCount}/{totalCount}</strong>
              {currentDay.seats.filter((s) => s.isTraveler).length > 0 ? (
                <span>+{currentDay.seats.filter((s) => s.isTraveler).length}{text.travelersCount}</span>
              ) : null}
            </span>
            {activeScriptTitle ? <span className="storyteller-script-badge">{activeScriptTitle}</span> : null}
            <button className="secondary-button secondary-button--small" onClick={() => setShowEditPlayersModal(true)} type="button">{text.editPlayers}</button>
          </div>
          <div className="storyteller-compact-toolbar__right">
            <audio ref={audioRef} />
            <div className="storyteller-bgm-mini">
              <button className="secondary-button secondary-button--small" onClick={() => setAudioPlaying((c) => !c)} type="button">{audioPlaying ? text.pause : text.play}</button>
              <select className="storyteller-bgm-mini__select" onChange={(e) => setSelectedAudioSrc(e.target.value)} value={selectedAudioSrc}>
                {audioTracks.map((t) => <option key={t.src} value={t.src}>{t.name}</option>)}
              </select>
              <label className="secondary-button secondary-button--small">
                {text.loadLocalFile}
                <input type="file" accept=".mp3" onChange={handleLocalFileChange} style={{ display: 'none' }} />
              </label>
            </div>
            <button className="print-button" onClick={openNewGamePanel} type="button">{text.newGame}</button>
            <button className="secondary-button secondary-button--small" onClick={() => { setShowRightPanel(true); setActiveConsoleSections((c) => { const n = new Set(c); n.add('settings'); return n }) }} type="button">{text.settings}</button>
            <button className="secondary-button secondary-button--small" onClick={() => setShowLogPanel((c) => !c)} type="button">{showLogPanel ? text.hideLog : text.showLog}</button>
            <button className="secondary-button secondary-button--small" onClick={() => setShowRightPanel((c) => !c)} type="button">{showRightPanel ? text.hidePanel : text.showPanel}</button>
          </div>
        </div>

        {/* ── Arena: round table + quick strip ── */}
        <div className="storyteller-arena">

          {/* Round table */}
          <div className="storyteller-table-card">
            <div className="storyteller-table" onClick={() => { setSelectedSeatNumber(null); if (pickerMode === 'none') setPickerMode('none'); setTagPopoutSeat(null) }} role="presentation">
              <div className="storyteller-table__ring" />
              {pointerSeat ? (
                <div className="storyteller-table__hand" style={{ '--pointer-angle': `${((pointerSeat - 1) / currentDay.seats.length) * 360 - 90}deg` } as CSSProperties} />
              ) : null}

              {/* ── Center ── */}
              <section className={`storyteller-center${showNominationSheet && currentDay.phase === 'nomination' ? ' storyteller-center--sheet-open' : ''}`}>
                {/* Left: Stage / Timer */}
                <div className="storyteller-center__left">
                  {/* Phase tabs */}
                  <div className="storyteller-center__phase-tabs">
                    {(['night', 'private', 'public', 'nomination'] as Phase[]).map((p) => (
                      <button
                        className={`storyteller-center__phase-btn${currentDay.phase === p ? ' storyteller-center__phase-btn--active' : ''}`}
                        key={p}
                        onClick={(e) => { e.stopPropagation(); setPhase(p) }}
                        type="button"
                      >
                        {p === 'night' ? text.nightPhase : p === 'private' ? text.privateChat : p === 'public' ? text.publicChat : text.nomination}
                      </button>
                    ))}
                  </div>
                  {/* Public mode select */}
                  {currentDay.phase === 'public' ? (
                    <select
                      className="storyteller-center__mode-select"
                      onChange={(e) => updateCurrentDay((d) => ({ ...d, publicMode: e.target.value as PublicMode }))}
                      value={currentDay.publicMode}
                    >
                      <option value="free">{text.freeSpeech}</option>
                      <option value="roundRobin">{text.roundRobinMode}</option>
                    </select>
                  ) : null}

                  {/* Timer */}
                  {hasTimer ? (
                    <input
                      aria-label="Current timer"
                      className="storyteller-center__timer-input"
                      onChange={(e) => {
                        const val = e.target.value
                        if (val.includes(':')) {
                          const [mPart, sPart] = val.split(':')
                          setCurrentTimer((parseInt(mPart, 10) || 0) * 60 + (parseInt(sPart, 10) || 0))
                        } else {
                          const n = parseInt(val, 10)
                          if (!isNaN(n)) setCurrentTimer(n)
                        }
                      }}
                      type="text"
                      inputMode="numeric"
                      value={`${String(Math.floor(currentTimerSeconds / 60)).padStart(2, '0')}:${String(currentTimerSeconds % 60).padStart(2, '0')}`}
                    />
                  ) : null}

                  {/* Timer controls */}
                  {hasTimer ? (
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

                  {/* Night phase BGM controls */}
                  {currentDay.phase === 'night' ? (
                    <div className="storyteller-center__timer-controls">
                      <button
                        className={`storyteller-center__ctrl-btn${audioPlaying ? ' storyteller-center__ctrl-btn--active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); audioPlaying ? setAudioPlaying(false) : startNight() }}
                        title={audioPlaying ? text.pause : text.play}
                        type="button"
                      >
                        {audioPlaying ? '⏸' : '▶'}
                      </button>
                      <button className="storyteller-center__ctrl-btn" onClick={(e) => { e.stopPropagation(); stopNight() }} title={text.endNow} type="button">■</button>
                    </div>
                  ) : null}

                  {/* RoundRobin speaker */}
                  {currentDay.phase === 'public' && currentDay.publicMode === 'roundRobin' ? (
                    <p className="storyteller-center__speaker">#{currentDay.currentSpeakerSeat ?? '—'}</p>
                  ) : null}

                  {/* RoundRobin speaker nav */}
                  {currentDay.phase === 'public' && currentDay.publicMode === 'roundRobin' ? (
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
                  {currentDay.phase === 'public' && currentDay.publicMode === 'free' ? (
                    canNominate ? (
                      <button className="print-button storyteller-start-vote" onClick={enterNomination} type="button">{text.startNomination}</button>
                    ) : (
                      <p className="storyteller-center__status storyteller-center__status--muted">
                        {text.nominationGate}: {Math.ceil(secondsUntilNomination / 60)}:{String(secondsUntilNomination % 60).padStart(2, '0')}
                      </p>
                    )
                  ) : null}

                  {currentDay.phase === 'nomination' && currentDay.nominationStep === 'nominationDecision' ? (
                    <div className="storyteller-center__timer-controls">
                      <button className="print-button" onClick={confirmNomination} type="button">{language === 'zh' ? '提名者计时' : 'Nominator Countdown'}</button>
                    </div>
                  ) : null}

                  {currentDay.phase === 'nomination' && currentDay.nominationStep === 'readyForTargetSpeech' ? (
                    <div className="storyteller-center__timer-controls">
                      <button className="print-button" onClick={confirmTargetSpeech} type="button">{language === 'zh' ? '被提名者计时' : 'Nominee Countdown'}</button>
                    </div>
                  ) : null}

                  {currentDay.phase === 'nomination' && currentDay.nominationStep === 'readyToVote' ? (
                    <div className="storyteller-center__timer-controls">
                      <button className="print-button" onClick={startVoting} type="button">{language === 'zh' ? '开始投票计时' : 'Start Vote'}</button>
                    </div>
                  ) : null}

                  {/* Nominate button + Next Day (nomination phase) */}
                  {currentDay.phase === 'nomination' ? (
                    <div className="storyteller-center__nominate-row">
                      <button
                        className={`print-button storyteller-start-vote${showNominationSheet ? ' tab-button--active' : ''}`}
                        onClick={() => setShowNominationSheet((v) => !v)}
                        type="button"
                      >{language === 'zh' ? '提名' : 'Nominate'}</button>
                      <button
                        className="secondary-button storyteller-center__next-day-btn"
                        onClick={(e) => { e.stopPropagation(); goToNextDay() }}
                        type="button"
                      >{language === 'zh' ? '下一天' : 'Next Day'}</button>
                    </div>
                  ) : null}
                </div>

                {/* Right: Day info */}
                <div className="storyteller-center__right">
                  {/* Day navigation */}
                  <div className="storyteller-center__day-nav">
                    <button className="storyteller-center__ctrl-btn" onClick={(e) => { e.stopPropagation(); goToPreviousDay() }} type="button">◀</button>
                    <select className="storyteller-center__mode-select" onChange={(e) => setSelectedDayId(e.target.value)} value={currentDay.id}>
                      {days.map((d) => <option key={d.id} value={d.id}>Day {d.day}</option>)}
                    </select>
                    <button className="storyteller-center__ctrl-btn" onClick={(e) => { e.stopPropagation(); goToNextDay() }} type="button">▶</button>
                  </div>

                  <div className="storyteller-center__game-stats">
                    <span>{text.aliveCount}: <strong>{aliveCount}/{totalCount}</strong></span>
                    <span>{text.requiredVotes}: <strong>{requiredVotes}</strong></span>
                  </div>

                  {/* Leading candidate(s) */}
                  {leadingCandidates.length > 0 ? (
                    <div className="storyteller-center__leading">
                      <span className="storyteller-center__leading-label">{text.leadingCandidate}</span>
                      {leadingCandidates.map((c) => (
                        <div className="storyteller-center__leading-row" key={c.seat}>
                          <span className="storyteller-center__leading-name">#{c.seat} {c.name}</span>
                          <span className="storyteller-center__leading-votes">{c.votes}<small>/{requiredVotes}</small></span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Nomination status */}
                  {currentDay.phase === 'nomination' && currentDay.nominationStep === 'waitingForNomination' ? (
                    <p className="storyteller-center__status">
                      {currentDay.voteDraft.actor ? `${text.actor}: #${currentDay.voteDraft.actor} → ${text.pickNominee}` : text.waitingForNomination}
                    </p>
                  ) : null}

                  {currentDay.phase === 'nomination' && currentDay.nominationStep !== 'waitingForNomination' ? (
                    <div className="storyteller-center__vote-mini">
                      <span>#{currentDay.voteDraft.actor ?? '?'} → #{currentDay.voteDraft.target ?? '?'}</span>
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

                  {/* Today's nominations summary */}
                  {nominatorsThisDay.length > 0 ? (
                    <div className="storyteller-center__summary">
                      <span>{text.todayNominators}: {nominatorsThisDay.map((s) => `#${s}`).join(', ')}</span>
                      <span>{text.todayNominees}: {nomineesThisDay.map((s) => `#${s}`).join(', ')}</span>
                    </div>
                  ) : null}
                </div>

                {/* ── Nomination sheet ── */}
                {showNominationSheet && currentDay.phase === 'nomination' ? (
                  <div className="storyteller-nomination-sheet" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="storyteller-nomination-sheet__header">
                      <span className="storyteller-nomination-sheet__title">{language === 'zh' ? '提名' : 'Nominate'}</span>
                      <button className="secondary-button secondary-button--small" onClick={() => { setShowNominationSheet(false); setPickerMode('none') }} type="button">{language === 'zh' ? '隐藏' : 'Hide'}</button>
                    </div>

                    <div className="storyteller-nomination-sheet__body">
                      {/* Left: inputs */}
                      <div className="storyteller-nomination-sheet__inputs">
                        {/* Nominator */}
                        <div className="storyteller-nomination-sheet__row">
                          <span className="storyteller-nomination-sheet__label">{text.actor}</span>
                          <select
                            className="storyteller-nomination-sheet__select"
                            onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, actor: v } })); setPickerMode('nominee') } else { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, actor: null } })) } }}
                            value={currentDay.voteDraft.actor ?? ''}
                          >
                            <option value="">{language === 'zh' ? '— 选择 —' : '— Select —'}</option>
                            {currentDay.seats.map((s) => <option key={s.seat} value={s.seat}>#{s.seat} {s.name}</option>)}
                          </select>
                          <button
                            className={`storyteller-nomination-sheet__pick-btn${pickerMode === 'nominator' ? ' storyteller-picker-active' : ''}`}
                            onClick={() => setPickerMode(pickerMode === 'nominator' ? 'none' : 'nominator')}
                            type="button"
                          >⊕</button>
                        </div>

                        {/* Nominee */}
                        <div className="storyteller-nomination-sheet__row">
                          <span className="storyteller-nomination-sheet__label">{text.target}</span>
                          <select
                            className="storyteller-nomination-sheet__select"
                            onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) updateCurrentDay((d) => ({ ...d, nominationStep: 'nominationDecision', voteDraft: { ...d.voteDraft, target: v, voters: [] } })); else updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, target: null } })) }}
                            value={currentDay.voteDraft.target ?? ''}
                          >
                            <option value="">{language === 'zh' ? '— 选择 —' : '— Select —'}</option>
                            {currentDay.seats.map((s) => <option key={s.seat} value={s.seat}>#{s.seat} {s.name}</option>)}
                          </select>
                          <button
                            className={`storyteller-nomination-sheet__pick-btn${pickerMode === 'nominee' ? ' storyteller-picker-active' : ''}`}
                            onClick={() => setPickerMode(pickerMode === 'nominee' ? 'none' : 'nominee')}
                            type="button"
                          >⊕</button>
                        </div>

                        {/* Nomination result */}
                        <div className="storyteller-nomination-sheet__row">
                          <span className="storyteller-nomination-sheet__label">{language === 'zh' ? '结果' : 'Result'}</span>
                          <select
                            className={`storyteller-nomination-sheet__select storyteller-nomination-sheet__select--result${currentDay.voteDraft.nominationResult === 'fail' ? ' storyteller-nomination-sheet__select--fail' : ' storyteller-nomination-sheet__select--succeed'}`}
                            onChange={(e) => updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, nominationResult: e.target.value as 'succeed' | 'fail' } }))}
                            value={currentDay.voteDraft.nominationResult}
                          >
                            <option value="succeed">{language === 'zh' ? '✓ 提名成功' : '✓ Succeed'}</option>
                            <option value="fail">{language === 'zh' ? '✗ 提名失败' : '✗ Failed'}</option>
                          </select>
                        </div>

                        {pickerMode === 'nominator' || pickerMode === 'nominee' ? (
                          <p className="storyteller-nomination-sheet__hint">{language === 'zh' ? '← 点击圆桌上的座位进行选择' : '← Click a seat on the table to select'}</p>
                        ) : null}

                        {/* Vote override: seat checkboxes */}
                        {currentDay.nominationStep !== 'waitingForNomination' && currentDay.voteDraft.nominationResult === 'succeed' ? (
                          <div className="storyteller-nomination-sheet__votes">
                            <span className="storyteller-nomination-sheet__label">{language === 'zh' ? '投票' : 'Votes'} ({language === 'zh' ? '手动覆盖' : 'override'})</span>
                            <div className="storyteller-nomination-sheet__vote-grid">
                              {currentDay.seats.map((s) => {
                                const voted = currentDay.votingState?.votes[s.seat]
                                const isChecked = voted === true || currentDay.voteDraft.voters.includes(s.seat)
                                return (
                                  <label className="storyteller-nomination-sheet__vote-check" key={s.seat}>
                                    <input
                                      checked={isChecked}
                                      onChange={() => {
                                        if (currentDay.votingState) {
                                          updateCurrentDay((d) => ({
                                            ...d,
                                            votingState: d.votingState ? {
                                              ...d.votingState,
                                              votes: { ...d.votingState.votes, [s.seat]: !isChecked },
                                            } : null,
                                          }))
                                        } else {
                                          updateCurrentDay((d) => ({
                                            ...d,
                                            voteDraft: {
                                              ...d.voteDraft,
                                              voters: isChecked ? d.voteDraft.voters.filter((v) => v !== s.seat) : [...d.voteDraft.voters, s.seat],
                                            },
                                          }))
                                        }
                                      }}
                                      type="checkbox"
                                    />
                                    <span>#{s.seat}</span>
                                  </label>
                                )
                              })}
                            </div>
                            <span className="storyteller-nomination-sheet__vote-count">
                              {language === 'zh' ? '同意' : 'Yes'}: <strong>{Object.values(currentDay.votingState?.votes ?? {}).filter(Boolean).length || currentDay.voteDraft.voters.length}</strong> / {requiredVotes}
                            </span>
                          </div>
                        ) : null}

                        {/* Note */}
                        <label className="storyteller-nomination-sheet__row storyteller-nomination-sheet__row--note">
                          <span className="storyteller-nomination-sheet__label">{language === 'zh' ? '备注' : 'Note'}</span>
                          <input
                            className="storyteller-nomination-sheet__note-input"
                            onChange={(e) => updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, note: e.target.value } }))}
                            placeholder={language === 'zh' ? '可选备注…' : 'Optional note…'}
                            type="text"
                            value={currentDay.voteDraft.note}
                          />
                        </label>

                        {/* Agree / Disagree */}
                        {isVotingComplete && currentDay.voteDraft.nominationResult === 'succeed' ? (
                          <div className="storyteller-chip-row">
                            <button className="print-button" onClick={() => setDialogState({ kind: 'voteResult', nextValue: true, systemValue: draftPassedBySystem })} type="button">✓ {language === 'zh' ? '同意' : 'Agree'}</button>
                            <button className="secondary-button" onClick={() => setDialogState({ kind: 'voteResult', nextValue: false, systemValue: draftPassedBySystem })} type="button">✗ {language === 'zh' ? '不同意' : 'Disagree'}</button>
                          </div>
                        ) : null}

                        {/* Record + Clear */}
                        <div className="storyteller-chip-row">
                          <button
                            className="print-button"
                            disabled={!currentDay.voteDraft.actor || !currentDay.voteDraft.target}
                            onClick={() => currentDay.voteDraft.nominationResult === 'fail' ? rejectNomination() : recordVote()}
                            type="button"
                          >{language === 'zh' ? '记录' : 'Record'}</button>
                          <button className="secondary-button secondary-button--small" onClick={() => { updateCurrentDay((d) => ({ ...d, nominationStep: 'waitingForNomination', voteDraft: createDefaultVoteDraft(), votingState: null })); setPickerMode('none') }} type="button">{text.clear}</button>
                        </div>
                      </div>

                      {/* Right: today's nomination history */}
                      <div className="storyteller-nomination-sheet__history">
                        <span className="storyteller-nomination-sheet__history-title">{language === 'zh' ? '今日提名记录' : "Today's Nominations"}</span>
                        {currentDay.voteHistory.length === 0 ? (
                          <p className="storyteller-nomination-sheet__history-empty">{language === 'zh' ? '暂无记录' : 'None yet'}</p>
                        ) : (
                          currentDay.voteHistory.map((record) => (
                            <div className={`storyteller-nomination-sheet__history-item${record.failed ? ' storyteller-nomination-sheet__history-item--failed' : record.passed ? ' storyteller-nomination-sheet__history-item--passed' : ' storyteller-nomination-sheet__history-item--failed'}`} key={record.id}>
                              <span className="storyteller-nomination-sheet__history-pair">
                                #{record.actor} → #{record.target}
                              </span>
                              {record.failed ? (
                                <span className="storyteller-nomination-sheet__history-result">{language === 'zh' ? '提名失败' : 'Nom. Failed'}</span>
                              ) : (
                                <>
                                  <span className="storyteller-nomination-sheet__history-votes">
                                    {language === 'zh' ? '票' : 'vote'}({record.voteCount}/{record.requiredVotes}){record.voters.length > 0 ? `: ${record.voters.map(v => `#${v}`).join(', ')}` : ''}
                                  </span>
                                  <span className={`storyteller-nomination-sheet__history-result${record.passed ? ' storyteller-nomination-sheet__history-result--pass' : ''}`}>
                                    {record.passed ? (language === 'zh' ? '通过' : 'Pass') : (language === 'zh' ? '失败' : 'Fail')}
                                    {record.note ? ` · ${record.note}` : ''}
                                  </span>
                                </>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              {/* ── Seat cards ── */}
              {currentDay.seats.map((seat, index) => {
                // Rectangular perimeter positioning (3:2 aspect ratio table)
                const total = currentDay.seats.length
                const W = 3, H = 2
                const perimeter = 2 * (W + H) // = 10
                const offset = (0.5 / total) * perimeter
                const p = (offset + (index / total) * perimeter) % perimeter
                const padX = 9, padY = 9
                let left: number, top: number
                if (p < W) {
                  left = padX + (p / W) * (100 - 2 * padX); top = padY
                } else if (p < W + H) {
                  left = 100 - padX; top = padY + ((p - W) / H) * (100 - 2 * padY)
                } else if (p < 2 * W + H) {
                  left = (100 - padX) - ((p - W - H) / W) * (100 - 2 * padX); top = 100 - padY
                } else {
                  left = padX; top = (100 - padY) - ((p - 2 * W - H) / H) * (100 - 2 * padY)
                }
                const tags = [!seat.alive ? text.aliveTag : '', seat.isExecuted ? text.executedTag : '', seat.isTraveler ? text.traveler : '', seat.hasNoVote ? text.noVoteTag : '', ...seat.customTags].filter(Boolean)
                const isSpoken = currentDay.roundRobinSpokenSeats.includes(seat.seat)
                const isVoteActor = currentDay.voteDraft.actor === seat.seat
                const isVoteTarget = currentDay.voteDraft.target === seat.seat
                const isSkillActor = skillOverlay?.draft.actor === seat.seat
                const isSkillTarget = skillOverlay?.draft.targets.includes(seat.seat) ?? false
                const isCurrentVoter = currentVoterSeat === seat.seat
                const hasVoted = currentDay.votingState?.votes[seat.seat] !== undefined
                const votedYes = currentDay.votingState?.votes[seat.seat] === true
                const isInNomination = currentDay.phase === 'nomination' && currentDay.nominationStep !== 'waitingForNomination'
                const cardVotedYes = currentDay.votingState
                  ? currentDay.votingState.votes[seat.seat] === true
                  : currentDay.voteDraft.voters.includes(seat.seat)
                const cardVotedNo = currentDay.votingState
                  ? currentDay.votingState.votes[seat.seat] === false
                  : currentDay.voteDraft.noVoters.includes(seat.seat)
                const isTagPopoutOpen = tagPopoutSeat === seat.seat
                const isSkillPopoutOpen = skillPopoutSeat === seat.seat

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
                      isCurrentVoter ? 'storyteller-seat--current-voter' : '',
                      pickerMode !== 'none' ? 'storyteller-seat--picker' : '',
                      isTagPopoutOpen || isSkillPopoutOpen ? 'storyteller-seat--tag-open' : '',
                    ].filter(Boolean).join(' ')}
                    key={seat.seat}
                    style={{ left: `${left}%`, top: `${top}%` } as CSSProperties}
                  >
                    <button className="storyteller-seat__surface" onClick={() => handleSeatClick(seat.seat)} type="button">
                      <div className="storyteller-seat__header">
                        <span className="storyteller-seat__nameline">
                          <span className="storyteller-seat__number">#{seat.seat}</span>
                          <span className="storyteller-seat__name">{seat.name}</span>
                        </span>
                        {hasVoted ? <span className={`storyteller-seat__vote-mark${votedYes ? '' : ' storyteller-seat__vote-mark--no'}`}>{votedYes ? '✓' : '✗'}</span> : null}
                      </div>
                    </button>

                    {/* Use Skill button */}
                    <button
                      className={`storyteller-seat__skill-btn${isSkillPopoutOpen ? ' storyteller-seat__skill-btn--open' : ''}`}
                      onClick={(e) => { e.stopPropagation(); if (isSkillPopoutOpen) { closeSkillOverlay(false) } else { openSeatSkill(seat.seat) } }}
                      type="button"
                    >{language === 'zh' ? '发动技能' : 'Use Skill'}</button>

                    {/* Tag button */}
                    <button
                      className={`storyteller-seat__tag-btn${isTagPopoutOpen ? ' storyteller-seat__tag-btn--open' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setTagPopoutSeat(isTagPopoutOpen ? null : seat.seat); setSkillPopoutSeat(null); if (skillOverlay && !isTagPopoutOpen) closeSkillOverlay(false) }}
                      type="button"
                    >{text.addTagLabel}</button>

                    {/* Agree / Disagree buttons during nomination */}
                    {isInNomination ? (
                      cardVotedYes ? (
                        <button
                          className="storyteller-seat__vote-indicator storyteller-seat__vote-indicator--yes"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (currentDay.votingState) {
                              updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: undefined as unknown as boolean } } : null }))
                            } else {
                              updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, voters: d.voteDraft.voters.filter((v) => v !== seat.seat) } }))
                            }
                          }}
                          type="button"
                        >✓</button>
                      ) : cardVotedNo ? (
                        <button
                          className="storyteller-seat__vote-indicator storyteller-seat__vote-indicator--no"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (currentDay.votingState) {
                              updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: undefined as unknown as boolean } } : null }))
                            } else {
                              updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, noVoters: d.voteDraft.noVoters.filter((v) => v !== seat.seat) } }))
                            }
                          }}
                          type="button"
                        >✗</button>
                      ) : (
                        <div className="storyteller-seat__vote-btns">
                          <button
                            className="storyteller-seat__vote-btn storyteller-seat__vote-btn--yes"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (currentDay.votingState) {
                                updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: true } } : null }))
                              } else {
                                updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, voters: [...d.voteDraft.voters, seat.seat], noVoters: d.voteDraft.noVoters.filter((v) => v !== seat.seat) } }))
                              }
                            }}
                            type="button"
                          >✓</button>
                          <button
                            className="storyteller-seat__vote-btn storyteller-seat__vote-btn--no"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (currentDay.votingState) {
                                updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: false } } : null }))
                              } else {
                                updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, noVoters: [...d.voteDraft.noVoters, seat.seat], voters: d.voteDraft.voters.filter((v) => v !== seat.seat) } }))
                              }
                            }}
                            type="button"
                          >✗</button>
                        </div>
                      )
                    ) : null}

                    {tags.length ? (
                      <div className="storyteller-seat__tag-list">
                        {tags.map((tag) => (
                          <span
                            className="storyteller-seat__pill"
                            key={`${seat.seat}-${tag}`}
                            onContextMenu={(e) => { if (!seat.customTags.includes(tag)) return; e.preventDefault(); removeSeatTag(seat.seat, tag) }}
                            title={seat.customTags.includes(tag) ? 'Right click to remove' : undefined}
                          >{tag}</span>
                        ))}
                      </div>
                    ) : null}

                    {/* Tag popout */}
                    {isTagPopoutOpen ? (
                      <div className="storyteller-tag-popout" onClick={(e) => e.stopPropagation()}>
                        {/* Tag grid: status toggles + custom tag pool */}
                        <div className="storyteller-tag-popout__grid">
                          <button className={`secondary-button secondary-button--small${!seat.alive ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, alive: !s.alive }))} type="button">{text.aliveTag}</button>
                          <button className={`secondary-button secondary-button--small${seat.isExecuted ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, isExecuted: !s.isExecuted }))} type="button">{text.executedTag}</button>
                          <button className={`secondary-button secondary-button--small${seat.isTraveler ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, isTraveler: !s.isTraveler }))} type="button">{text.traveler}</button>
                          <button className={`secondary-button secondary-button--small${seat.hasNoVote ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, hasNoVote: !s.hasNoVote }))} type="button">{text.noVoteTag}</button>
                          {customTagPool.map((tag) => (
                            <button
                              className={`secondary-button secondary-button--small${seat.customTags.includes(tag) ? ' tab-button--active' : ''}`}
                              key={`pop-${tag}`}
                              onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, customTags: s.customTags.includes(tag) ? s.customTags.filter((v) => v !== tag) : [...s.customTags, tag] }))}
                              type="button"
                            >{tag}</button>
                          ))}
                        </div>
                        {/* Input + add button at bottom */}
                        <div className="storyteller-tag-popout__add-row">
                          <input
                            autoFocus
                            onChange={(e) => setSeatTagDrafts((c) => ({ ...c, [seat.seat]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(seat.seat); setSeatTagDrafts((c) => ({ ...c, [seat.seat]: '' })) } }}
                            placeholder={text.addTag}
                            type="text"
                            value={seatTagDrafts[seat.seat] ?? ''}
                          />
                          <button
                            className="storyteller-tag-popout__add-btn"
                            onMouseDown={(e) => { e.preventDefault(); addCustomTag(seat.seat); setSeatTagDrafts((c) => ({ ...c, [seat.seat]: '' })) }}
                            type="button"
                          >+</button>
                        </div>
                      </div>
                    ) : null}

                    {/* Skill popout */}
                    {isSkillPopoutOpen && skillOverlay ? (
                      <div className="storyteller-skill-popout" onClick={(e) => e.stopPropagation()}>
                        {/* Actor */}
                        <div className="storyteller-skill-popout__actor">
                          <span>{language === 'zh' ? '发动者' : 'Actor'}</span>
                          <strong>#{seat.seat} {seat.name}</strong>
                        </div>

                        {/* Targets */}
                        <div className="storyteller-skill-popout__target-section">
                          <span className="storyteller-skill-popout__label">{language === 'zh' ? '目标' : 'Target'}</span>
                          <div className="storyteller-skill-popout__target-grid">
                            {currentDay.seats.map((s) => {
                              const isTarget = skillOverlay.draft.targets.includes(s.seat)
                              return (
                                <label className="storyteller-skill-popout__target-check" key={s.seat}>
                                  <input
                                    checked={isTarget}
                                    onChange={() => setSkillOverlay((p) => {
                                      if (!p) return p
                                      const targets = isTarget ? p.draft.targets.filter((t) => t !== s.seat) : [...p.draft.targets, s.seat]
                                      return { ...p, draft: { ...p.draft, targets } }
                                    })}
                                    type="checkbox"
                                  />
                                  <span>#{s.seat}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>

                        {/* Role */}
                        {/* Claimed role — optional single dropdown with icons */}
                        <div className="storyteller-skill-popout__field">
                          <span>{text.skillRole}</span>
                          <div className="storyteller-skill-popout__role-dropdown">
                            <button
                              className="storyteller-skill-popout__role-trigger"
                              onClick={(e) => { e.stopPropagation(); setSkillRoleDropdownOpen((o) => !o) }}
                              type="button"
                            >
                              {skillOverlay.draft.roleId ? (
                                <>
                                  {getIconForCharacter(skillOverlay.draft.roleId) ? <img alt="" className="storyteller-skill-overlay__role-icon" src={getIconForCharacter(skillOverlay.draft.roleId) as string} /> : null}
                                  <span>{getDisplayName(skillOverlay.draft.roleId, language)}</span>
                                </>
                              ) : <span className="storyteller-skill-popout__role-placeholder">{language === 'zh' ? '— 未声明 —' : '— None —'}</span>}
                              <span className="storyteller-skill-popout__role-caret">▾</span>
                            </button>
                            {skillRoleDropdownOpen ? (
                              <div className="storyteller-skill-popout__role-options">
                                <button
                                  className="storyteller-skill-popout__role-option"
                                  onClick={() => { setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, roleId: '' } } : p); setSkillRoleDropdownOpen(false) }}
                                  type="button"
                                >{language === 'zh' ? '— 未声明 —' : '— None —'}</button>
                                {currentScriptCharacters.map((c) => {
                                  const icon = getIconForCharacter(c)
                                  const name = getDisplayName(c, language)
                                  return (
                                    <button
                                      className={`storyteller-skill-popout__role-option${skillOverlay.draft.roleId === c ? ' storyteller-skill-popout__role-option--active' : ''}`}
                                      key={c}
                                      onClick={() => { setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, roleId: c } } : p); setSkillRoleDropdownOpen(false) }}
                                      type="button"
                                    >
                                      {icon ? <img alt="" className="storyteller-skill-overlay__role-icon" src={icon as string} /> : null}
                                      <span>{name}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Statement */}
                        <label className="storyteller-skill-popout__field">
                          <span>{text.statement}</span>
                          <input onChange={(e) => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, statement: e.target.value } } : p)} placeholder={text.statement} type="text" value={skillOverlay.draft.statement} />
                        </label>

                        {/* Note */}
                        <label className="storyteller-skill-popout__field">
                          <span>{text.note}</span>
                          <input onChange={(e) => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, note: e.target.value } } : p)} placeholder={text.note} type="text" value={skillOverlay.draft.note} />
                        </label>

                        {/* Per-target notes */}
                        {skillOverlay.draft.targets.map((t) => (
                          <label className="storyteller-skill-popout__field" key={t}>
                            <span>#{t} {text.targetNote}</span>
                            <input onChange={(e) => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, targetNotes: { ...p.draft.targetNotes, [t]: e.target.value } } } : p)} type="text" value={skillOverlay.draft.targetNotes[t] ?? ''} />
                          </label>
                        ))}

                        {/* Result */}
                        <div className="storyteller-chip-row">
                          <button className={`secondary-button secondary-button--small${skillOverlay.draft.result === 'success' ? ' tab-button--active' : ''}`} onClick={() => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, result: p.draft.result === 'success' ? null : 'success' } } : p)} type="button">{text.success}</button>
                          <button className={`secondary-button secondary-button--small${skillOverlay.draft.result === 'failure' ? ' tab-button--active' : ''}`} onClick={() => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, result: p.draft.result === 'failure' ? null : 'failure' } } : p)} type="button">{text.failure}</button>
                        </div>

                        {/* Save / Cancel */}
                        <div className="storyteller-chip-row">
                          <button className="print-button" onClick={() => closeSkillOverlay(true)} type="button">{text.saveSkill}</button>
                          <button className="secondary-button" onClick={() => closeSkillOverlay(false)} type="button">{text.cancelSkill}</button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
            {/* nomination sheet moved into center card above */}
            {false ? (
              <div className="storyteller-nomination-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="storyteller-nomination-sheet__header">
                  <span className="storyteller-nomination-sheet__title">{language === 'zh' ? '提名' : 'Nominate'}</span>
                  <button className="secondary-button secondary-button--small" onClick={() => { setShowNominationSheet(false); setPickerMode('none') }} type="button">{language === 'zh' ? '隐藏' : 'Hide'}</button>
                </div>

                {/* Nominator */}
                <div className="storyteller-nomination-sheet__row">
                  <span className="storyteller-nomination-sheet__label">{text.actor}</span>
                  <select
                    className="storyteller-nomination-sheet__select"
                    onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, actor: v } })); setPickerMode('nominee') } else { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, actor: null } })) } }}
                    value={currentDay.voteDraft.actor ?? ''}
                  >
                    <option value="">{language === 'zh' ? '— 选择 —' : '— Select —'}</option>
                    {currentDay.seats.map((s) => <option key={s.seat} value={s.seat}>#{s.seat} {s.name}</option>)}
                  </select>
                  <button
                    className={`secondary-button secondary-button--small${pickerMode === 'nominator' ? ' storyteller-picker-active' : ''}`}
                    onClick={() => setPickerMode(pickerMode === 'nominator' ? 'none' : 'nominator')}
                    type="button"
                  >{language === 'zh' ? '点击座位' : 'Pick seat'}</button>
                </div>

                {/* Nominee */}
                <div className="storyteller-nomination-sheet__row">
                  <span className="storyteller-nomination-sheet__label">{text.target}</span>
                  <select
                    className="storyteller-nomination-sheet__select"
                    onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) updateCurrentDay((d) => ({ ...d, nominationStep: 'nominationDecision', voteDraft: { ...d.voteDraft, target: v, voters: [] } })); else updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, target: null } })) }}
                    value={currentDay.voteDraft.target ?? ''}
                  >
                    <option value="">{language === 'zh' ? '— 选择 —' : '— Select —'}</option>
                    {currentDay.seats.map((s) => <option key={s.seat} value={s.seat}>#{s.seat} {s.name}</option>)}
                  </select>
                  <button
                    className={`secondary-button secondary-button--small${pickerMode === 'nominee' ? ' storyteller-picker-active' : ''}`}
                    onClick={() => setPickerMode(pickerMode === 'nominee' ? 'none' : 'nominee')}
                    type="button"
                  >{language === 'zh' ? '点击座位' : 'Pick seat'}</button>
                </div>

                {pickerMode === 'nominator' || pickerMode === 'nominee' ? (
                  <p className="storyteller-nomination-sheet__hint">{language === 'zh' ? '↑ 点击圆桌上的座位进行选择' : '↑ Click a seat on the table to select'}</p>
                ) : null}

                {/* Vote override: seat checkboxes */}
                {currentDay.nominationStep !== 'waitingForNomination' ? (
                  <div className="storyteller-nomination-sheet__votes">
                    <span className="storyteller-nomination-sheet__label">{language === 'zh' ? '投票' : 'Votes'} ({language === 'zh' ? '手动覆盖' : 'override'})</span>
                    <div className="storyteller-nomination-sheet__vote-grid">
                      {currentDay.seats.map((s) => {
                        const voted = currentDay.votingState?.votes[s.seat]
                        const isChecked = voted === true || currentDay.voteDraft.voters.includes(s.seat)
                        return (
                          <label className="storyteller-nomination-sheet__vote-check" key={s.seat}>
                            <input
                              checked={isChecked}
                              onChange={() => {
                                if (currentDay.votingState) {
                                  updateCurrentDay((d) => ({
                                    ...d,
                                    votingState: d.votingState ? {
                                      ...d.votingState,
                                      votes: { ...d.votingState.votes, [s.seat]: !isChecked },
                                    } : null,
                                  }))
                                } else {
                                  updateCurrentDay((d) => ({
                                    ...d,
                                    voteDraft: {
                                      ...d.voteDraft,
                                      voters: isChecked ? d.voteDraft.voters.filter((v) => v !== s.seat) : [...d.voteDraft.voters, s.seat],
                                    },
                                  }))
                                }
                              }}
                              type="checkbox"
                            />
                            <span>#{s.seat}</span>
                          </label>
                        )
                      })}
                    </div>
                    <span className="storyteller-nomination-sheet__vote-count">
                      {language === 'zh' ? '同意' : 'Yes'}: <strong>{Object.values(currentDay.votingState?.votes ?? {}).filter(Boolean).length || currentDay.voteDraft.voters.length}</strong> / {requiredVotes}
                    </span>
                  </div>
                ) : null}

                {/* Note */}
                <label className="storyteller-nomination-sheet__row storyteller-nomination-sheet__row--note">
                  <span className="storyteller-nomination-sheet__label">{language === 'zh' ? '备注' : 'Note'}</span>
                  <input
                    className="storyteller-nomination-sheet__note-input"
                    onChange={(e) => updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, note: e.target.value } }))}
                    placeholder={language === 'zh' ? '可选备注…' : 'Optional note…'}
                    type="text"
                    value={currentDay.voteDraft.note}
                  />
                </label>

                {/* Agree / Disagree */}
                {isVotingComplete ? (
                  <div className="storyteller-chip-row">
                    <button className="print-button" onClick={() => setDialogState({ kind: 'voteResult', nextValue: true, systemValue: draftPassedBySystem })} type="button">✓ {language === 'zh' ? '同意' : 'Agree'}</button>
                    <button className="secondary-button" onClick={() => setDialogState({ kind: 'voteResult', nextValue: false, systemValue: draftPassedBySystem })} type="button">✗ {language === 'zh' ? '不同意' : 'Disagree'}</button>
                  </div>
                ) : null}

                {/* Record + Clear */}
                <div className="storyteller-chip-row">
                  <button className="print-button" disabled={!currentDay.voteDraft.actor || !currentDay.voteDraft.target} onClick={recordVote} type="button">{language === 'zh' ? '记录' : 'Record'}</button>
                  <button className="secondary-button secondary-button--small" onClick={() => { updateCurrentDay((d) => ({ ...d, nominationStep: 'waitingForNomination', voteDraft: createDefaultVoteDraft(), votingState: null })); setPickerMode('none') }} type="button">{text.clear}</button>
                </div>
              </div>
            ) : null}

            <p className="storyteller-panel__hint">{text.seatHint}</p>
          </div>

          {/* ── Quick action strip ── */}
          <nav className="storyteller-quick-strip">
            <button
              className={`storyteller-quick-btn${showLogPanel ? ' storyteller-quick-btn--active' : ''}`}
              onClick={() => setShowLogPanel((c) => !c)}
              type="button"
            >{showLogPanel ? text.hideLog : text.showLog}</button>

            {currentDay.phase === 'nomination' ? (
              <button
                className="storyteller-quick-btn"
                onClick={() => setPickerMode('nominator')}
                type="button"
              >{text.quickNomination}</button>
            ) : null}

            <button
              className="storyteller-quick-btn"
              onClick={openSkillOverlay}
              type="button"
            >{text.quickSkill}</button>

            <button
              className="storyteller-quick-btn"
              onClick={goToNextDay}
              type="button"
            >{text.nextDay}</button>

            <button
              className="storyteller-quick-btn"
              onClick={openEndGamePanel}
              type="button"
            >{text.endGame}</button>

            <button
              className="storyteller-quick-btn"
              onClick={exportGameJson}
              type="button"
            >{text.exportJson}</button>

            <button
              className={`storyteller-quick-btn${showRightPanel ? ' storyteller-quick-btn--active' : ''}`}
              onClick={() => setShowRightPanel((c) => !c)}
              type="button"
            >{showRightPanel ? text.hidePanel : text.showPanel}</button>
          </nav>
        </div>
      </section>

      {/* ── Right side panel: Console ── */}
      <aside className={`storyteller-side-panel storyteller-side-panel--right${showRightPanel ? ' storyteller-side-panel--open' : ''}`}>
        <section className="storyteller-console storyteller-console-sections">

          {/* ── Section 1: Game ── */}
          <div className="storyteller-console-section">
            <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('game')} type="button">
              <span>{text.gameSection}</span>
              <span>{activeConsoleSections.has('game') ? '▼' : '▶'}</span>
            </button>
            {activeConsoleSections.has('game') ? (
              <div className="storyteller-console-section__body">
                <label className="editor-field storyteller-script-select">
                  <span>{text.script}</span>
                  <select onChange={(e) => onSelectScript?.(e.target.value)} value={activeScriptSlug ?? scriptOptions[0]?.slug ?? ''}>
                    {scriptOptions.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
                  </select>
                </label>
                <div className="storyteller-chip-row">
                  <button className="secondary-button" onClick={() => setDialogState({ kind: 'restartGame' })} type="button">{text.restartGame}</button>
                  <button className="secondary-button" onClick={exportGameJson} type="button">{text.exportJson}</button>
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Section 2: Day / Nomination ── */}
          <div className="storyteller-console-section">
            <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('day')} type="button">
              <span>{text.daySection}</span>
              <span>{activeConsoleSections.has('day') ? '▼' : '▶'}</span>
            </button>
            {activeConsoleSections.has('day') ? (
              <div className="storyteller-console-section__body">
                {/* Add Traveler */}
                <div className="storyteller-chip-row">
                  <button className="secondary-button" onClick={addTravelerSeat} type="button">{text.addTraveler}</button>
                </div>

                {/* Nomination controls */}
                {currentDay.phase === 'nomination' ? (
                  <div className="storyteller-console__section">
                    <span className="storyteller-console__label">{text.nomination}</span>
                    <div className="storyteller-chip-row">
                      <button className="secondary-button" onClick={() => setPickerMode('nominator')} type="button">{text.pickNominator}</button>
                      <button className="secondary-button" onClick={() => setPickerMode('nominee')} type="button">{text.pickNominee}</button>
                    </div>
                    <div className="storyteller-vote-summary">
                      <div><span>{text.actor}</span><strong>{currentDay.voteDraft.actor ? `#${currentDay.voteDraft.actor}` : '—'}</strong></div>
                      <div><span>{text.target}</span><strong>{currentDay.voteDraft.target ? `#${currentDay.voteDraft.target}` : '—'}</strong></div>
                      <div><span>{text.requiredVotes}</span><strong>{requiredVotes}</strong></div>
                      <div><span>{text.voters}</span><strong>{votingYesCount}</strong></div>
                    </div>
                    <label className="editor-field">
                      <span>{text.note}</span>
                      <input onChange={(e) => updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, note: e.target.value } }))} type="text" value={currentDay.voteDraft.note} />
                    </label>
                    {isVotingComplete ? (
                      <div className="storyteller-chip-row">
                        <button className="secondary-button" onClick={() => setDialogState({ kind: 'voteResult', nextValue: true, systemValue: draftPassedBySystem })} type="button">{text.systemOverridePass}</button>
                        <button className="secondary-button" onClick={() => setDialogState({ kind: 'voteResult', nextValue: false, systemValue: draftPassedBySystem })} type="button">{text.systemOverrideFail}</button>
                        <button className="secondary-button" onClick={() => updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, manualPassed: null } }))} type="button">{text.clearOverride}</button>
                      </div>
                    ) : null}
                    <div className="storyteller-chip-row">
                      <button className="secondary-button" onClick={() => { updateCurrentDay((d) => ({ ...d, nominationStep: 'waitingForNomination', nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteDraft: createDefaultVoteDraft(), votingState: null })); setPickerMode('nominator') }} type="button">{text.clear}</button>
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
              <span>{activeConsoleSections.has('player') ? '▼' : '▶'}</span>
            </button>
            {activeConsoleSections.has('player') ? (
              <div className="storyteller-console-section__body">
                {/* Player count info + edit button */}
                <div className="storyteller-chip-row" style={{ alignItems: 'center' }}>
                  <span className="storyteller-compact-count">
                    <strong>{aliveCount}/{totalCount}</strong>
                    {currentDay.seats.filter((s) => s.isTraveler).length > 0 ? (
                      <span>+{currentDay.seats.filter((s) => s.isTraveler).length}{text.travelersCount}</span>
                    ) : null}
                  </span>
                  <button className="secondary-button secondary-button--small" onClick={() => setShowEditPlayersModal(true)} type="button">{text.editPlayers}</button>
                </div>

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
                            const seat = currentDay.seats.find((s) => s.name.startsWith('Player '))
                            if (seat) updateSeat(seat.seat, (s) => ({ ...s, name }))
                          }}
                          title={text.assignName}
                        >{name}</span>
                      )
                    })}
                  </div>
                  <div className="storyteller-chip-row">
                    <button className="secondary-button secondary-button--small" onClick={() => setPlayerNamePool(language === 'zh' ? [...FAKE_NAMES_ZH] : [...FAKE_NAMES])} type="button">{text.loadFakeNames}</button>
                    <button className="secondary-button secondary-button--small" onClick={resetSeatNames} type="button">{text.resetNames}</button>
                    <button className="secondary-button secondary-button--small" onClick={() => setPlayerNamePool([])} type="button">{text.clear}</button>
                  </div>
                </div>

                {/* Selected player editor */}
                {selectedSeat ? (
                  <div className="storyteller-console__section">
                    <div className="storyteller-seat-editor">
                      <div className="storyteller-seat-editor__section">
                        <strong>{text.selectedPlayer}</strong>
                        <span>#{selectedSeat.seat} {selectedSeat.name}</span>
                      </div>
                      <div className="storyteller-seat-editor__section">
                        <div className="storyteller-chip-row">
                          <button className={`secondary-button secondary-button--small${!selectedSeat.alive ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, alive: !s.alive }))} type="button">{text.aliveTag}</button>
                          <button className={`secondary-button secondary-button--small${selectedSeat.isExecuted ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, isExecuted: !s.isExecuted }))} type="button">{text.executedTag}</button>
                          <button className={`secondary-button secondary-button--small${selectedSeat.isTraveler ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, isTraveler: !s.isTraveler }))} type="button">{text.traveler}</button>
                          <button className={`secondary-button secondary-button--small${selectedSeat.hasNoVote ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, hasNoVote: !s.hasNoVote }))} type="button">{text.noVoteTag}</button>
                        </div>
                      </div>
                      {selectedSeatTags.length ? (
                        <div className="storyteller-chip-row">
                          {selectedSeatTags.map((tag) => <span className="storyteller-seat__pill" key={`${selectedSeat.seat}-${tag}`}>{tag}</span>)}
                        </div>
                      ) : null}
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
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* ── Section 4: Settings (CountDown) ── */}
          <div className="storyteller-console-section">
            <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('settings')} type="button">
              <span>{text.settings}</span>
              <span>{activeConsoleSections.has('settings') ? '▼' : '▶'}</span>
            </button>
            {activeConsoleSections.has('settings') ? (
              <div className="storyteller-console-section__body">
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

          {/* ── Section 5: Tags ── */}
          <div className="storyteller-console-section">
            <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('tags')} type="button">
              <span>{text.tagSettings}</span>
              <span>{activeConsoleSections.has('tags') ? '▼' : '▶'}</span>
            </button>
            {activeConsoleSections.has('tags') ? (
              <div className="storyteller-console-section__body">
                {/* Default tags */}
                <div className="storyteller-console__section">
                  <span className="storyteller-console__label">{text.defaultTags}</span>
                  <div className="storyteller-chip-row">
                    {(language === 'zh'
                      ? ['死亡', '处决', '中毒', '醉酒', '保护', '被提名']
                      : ['Dead', 'Executed', 'Poisoned', 'Drunk', 'Protected', 'Nominated']
                    ).map((tag) => (
                      <span className="storyteller-seat__pill" key={`default-${tag}`}>{tag}</span>
                    ))}
                  </div>
                </div>
                {/* Load predefined tags */}
                <div className="storyteller-console__section">
                  <span className="storyteller-console__label">{text.loadPredefinedTags}</span>
                  <div className="storyteller-seat-editor__add">
                    <textarea
                      className="storyteller-preset-textarea"
                      onChange={(e) => setLoadTagsPreset(e.target.value)}
                      placeholder={language === 'zh' ? '逗号分隔标签...' : 'Comma-separated tags...'}
                      rows={2}
                      value={loadTagsPreset}
                    />
                    <button
                      className="secondary-button secondary-button--small"
                      onClick={() => {
                        const tags = loadTagsPreset.split(',').map((t) => t.trim()).filter(Boolean)
                        setCustomTagPool((cur) => uniqueStrings([...cur, ...tags]))
                        setLoadTagsPreset('')
                      }}
                      type="button"
                    >{text.loadPreset}</button>
                  </div>
                </div>
                {/* Current custom tag pool */}
                <div className="storyteller-console__section">
                  <div className="storyteller-console__pool-header">
                    <span className="storyteller-console__label">{text.tagPool}</span>
                    <button className="secondary-button secondary-button--small" onClick={clearUnusedCustomTags} type="button">{text.clearUnusedTags}</button>
                  </div>
                  <div className="storyteller-chip-row">
                    {customTagPool.map((tag) => (
                      <span className="storyteller-tag-pool-item" key={`tagpool-${tag}`}>
                        <span>{tag}</span>
                        <button
                          className="storyteller-tag-pool-item__remove"
                          onClick={() => setCustomTagPool((cur) => cur.filter((t) => t !== tag))}
                          type="button"
                        >×</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Completed Games */}
          <div className="storyteller-console__section" style={{ marginTop: '0.5rem' }}>
            <span className="storyteller-console__label">{text.completedGames}</span>
            <div className="storyteller-history" style={{ maxHeight: '200px', overflowY: 'auto' }}>
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
          </div>
        </section>
      </aside>
      {/* Edit Players Modal */}
      {showEditPlayersModal ? (
        <div className="storyteller-modal" role="dialog" aria-modal="true" onClick={() => setShowEditPlayersModal(false)}>
          <div className="storyteller-modal__card storyteller-edit-players-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{text.editPlayers}</h3>

            {/* Preset loader */}
            <div className="editor-field">
              <span>{language === 'zh' ? '批量加载（逗号分隔）' : 'Batch load (comma-separated)'}</span>
              <div className="storyteller-seat-editor__add">
                <textarea
                  className="storyteller-preset-textarea"
                  onChange={(e) => setEditPlayersPreset(e.target.value)}
                  placeholder={language === 'zh' ? '张三, 李四, 王五...' : 'Alice, Bob, Charlie...'}
                  rows={2}
                  value={editPlayersPreset}
                />
                <button
                  className="secondary-button secondary-button--small"
                  onClick={() => {
                    const names = editPlayersPreset.split(',').map((n) => n.trim()).filter(Boolean)
                    updateCurrentDay((d) => {
                      const newSeats = d.seats.map((s, i) => names[i] ? { ...s, name: names[i] } : s)
                      return { ...d, seats: newSeats }
                    })
                    setPlayerNamePool((cur) => uniqueStrings([...cur, ...names.filter((n) => !n.match(/^Player \d+$/) && !n.match(/^Traveler \d+$/))]))
                    setEditPlayersPreset('')
                  }}
                  type="button"
                >{text.loadPreset}</button>
              </div>
            </div>

            {/* Player count control */}
            <div className="storyteller-edit-players__count-row">
              <span>{language === 'zh' ? '玩家人数（不含旅人）' : 'Players (excl. travelers)'}</span>
              <div className="storyteller-center__day-nav">
                <button className="storyteller-center__ctrl-btn" onClick={removeLastPlayerSeat} type="button" disabled={currentDay.seats.filter((s) => !s.isTraveler).length <= 5}>−</button>
                <strong style={{ minWidth: '2rem', textAlign: 'center' }}>{currentDay.seats.filter((s) => !s.isTraveler).length}</strong>
                <button className="storyteller-center__ctrl-btn" onClick={addPlayerSeat} type="button" disabled={currentDay.seats.filter((s) => !s.isTraveler).length >= 15}>+</button>
              </div>
            </div>

            {/* Regular seat rows */}
            <div className="storyteller-new-game-seats">
              {currentDay.seats.filter((s) => !s.isTraveler).map((seat) => (
                <div className="storyteller-new-game-seats__row" key={seat.seat}>
                  <span>#{seat.seat}</span>
                  <input
                    list="name-pool-list"
                    onChange={(e) => updateSeat(seat.seat, (s) => ({ ...s, name: e.target.value }))}
                    onBlur={(e) => {
                      const val = e.target.value.trim()
                      if (val && !val.match(/^Player \d+$/) && !playerNamePool.includes(val)) {
                        setPlayerNamePool((cur) => [...cur, val])
                      }
                    }}
                    placeholder={`Player ${seat.seat}`}
                    type="text"
                    value={seat.name}
                  />
                </div>
              ))}
            </div>

            {/* Traveler count control */}
            <div className="storyteller-edit-players__count-row" style={{ marginTop: '0.75rem' }}>
              <span>{language === 'zh' ? '旅人人数' : 'Travelers'}</span>
              <div className="storyteller-center__day-nav">
                <button className="storyteller-center__ctrl-btn" onClick={removeLastTraveler} type="button" disabled={currentDay.seats.filter((s) => s.isTraveler).length === 0}>−</button>
                <strong style={{ minWidth: '2rem', textAlign: 'center' }}>{currentDay.seats.filter((s) => s.isTraveler).length}</strong>
                <button className="storyteller-center__ctrl-btn" onClick={addTravelerSeat} type="button">+</button>
              </div>
            </div>

            {/* Traveler rows */}
            {currentDay.seats.filter((s) => s.isTraveler).length > 0 ? (
              <div className="storyteller-new-game-seats">
                {currentDay.seats.filter((s) => s.isTraveler).map((seat) => (
                  <div className="storyteller-new-game-seats__row" key={seat.seat}>
                    <span>✈ #{seat.seat}</span>
                    <input
                      list="name-pool-list"
                      onChange={(e) => updateSeat(seat.seat, (s) => ({ ...s, name: e.target.value }))}
                      placeholder={`Traveler ${seat.seat}`}
                      type="text"
                      value={seat.name}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <datalist id="name-pool-list">
              {playerNamePool.map((name) => <option key={name} value={name} />)}
            </datalist>

            <div className="storyteller-chip-row" style={{ marginTop: '0.75rem' }}>
              <button className="secondary-button" onClick={resetSeatNames} type="button">{text.resetNames}</button>
              <button className="print-button" onClick={() => setShowEditPlayersModal(false)} type="button">{language === 'zh' ? '完成' : 'Done'}</button>
            </div>
          </div>
        </div>
      ) : null}

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