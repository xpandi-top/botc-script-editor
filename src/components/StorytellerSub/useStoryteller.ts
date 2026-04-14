
import { useEffect, useMemo, useRef, useState } from 'react'
import { characterById } from '../../catalog'
import { loadInitialState } from './storage'
import { createDayState, createSeats, createDefaultVoteDraft, createDefaultSkillDraft, getNextRoundRobinSeat, buildVotingOrder, unique, uniqueStrings, shuffleArray, INITIAL_AUDIO_TRACKS, STORAGE_KEY, CHARACTER_DISTRIBUTION, makeEventId, DEFAULT_PLAYER_COUNT } from './constants'
import type { Phase, GameRecord, NominationStep, PickerMode, NewGameConfig, EndGameResult, LogFilterState, AggregatedLogEntry, ConsoleSection, StorytellerSeat, VoteRecord, SkillRecord, DialogState, SkillOverlayState, StorytellerHelperProps, DayState, EventLogEntry, PersistedState, AudioTrack } from './types'
import type { Team } from '../../types'

export function useStoryteller(props: StorytellerHelperProps) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions } = props;

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
  const [activeRightPopup, setActiveRightPopup] = useState<'log' | 'settings' | null>(null)
  const [showScriptPanel, setShowScriptPanel] = useState(false)
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

  function saveCurrentGame(
    winner?: 'evil' | 'good' | 'storyteller' | null,
    playerSummaries?: GameRecord['playerSummaries'],
    mvp?: number | null,
    balanced?: number | null,
    funEvil?: number | null,
    funGood?: number | null,
    replay?: number | null,
    otherNote?: string
  ) {
    setGameRecords((cur) => [
      {
        id: `${Date.now()}`,
        endedAt: Date.now(),
        scriptTitle: activeScriptTitle,
        scriptSlug: activeScriptSlug,
        winner: winner ?? null,
        playerSummaries,
        mvp,
        balanced,
        funEvil,
        funGood,
        replay,
        otherNote,
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
      openEndGamePanel()
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
      const newSeat: StorytellerSeat = { 
        seat: nextNum, 
        name: `Player ${nextNum}`, 
        alive: true, 
        isTraveler: false, 
        isExecuted: false, 
        hasNoVote: false, 
        customTags: [],
        characterId: null,
        userCharacterId: null,
        teamTag: null,
        note: '',
      }
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
        characterId: null,
        userCharacterId: null,
        teamTag: null,
        note: '',
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
    const seatNames: Record<number, string> = {}
    for (let i = 1; i <= 9; i++) seatNames[i] = `Player ${i}`
    
    setNewGamePanel({
      playerCount: 9,
      travelerCount: 0,
      scriptSlug: slug,
      allowDuplicateChars: false,
      allowEmptyChars: false,
      allowSameNames: false,
      seatNames,
      assignments: {},
      userAssignments: {},
      seatNotes: {},
      specialNote: '',
    })
  }

  function randomAssignCharacters(config: NewGameConfig): Record<number, string> {
    const dist = CHARACTER_DISTRIBUTION[config.playerCount]
    if (!dist) return {}
    const script = scriptOptions.find((s) => s.slug === config.scriptSlug)
    if (!script) return {}

    const byTeam: Record<string, string[]> = { townsfolk: [], outsider: [], minion: [], demon: [] }
    for (const cid of script.characters) {
      const char = characterById[cid]
      if (char && byTeam[char.team]) {
        byTeam[char.team].push(cid)
      }
    }

    const assignments: Record<number, string> = {}
    const teams: Array<{ team: Team; count: number }> = [
      { team: 'townsfolk', count: dist.townsfolk },
      { team: 'outsider', count: dist.outsider },
      { team: 'minion', count: dist.minion },
      { team: 'demon', count: dist.demon },
    ]

    const teamPool: Team[] = []
    for (const { team, count } of teams) {
      for (let i = 0; i < count; i++) teamPool.push(team)
    }
    const shuffledTeams = shuffleArray(teamPool)
    const usedChars = new Set<string>()

    for (let i = 0; i < config.playerCount; i++) {
      const seatNum = i + 1
      const team = shuffledTeams[i]
      const pool = byTeam[team] || []
      
      let eligible = pool
      if (!config.allowDuplicateChars) {
        eligible = pool.filter(c => !usedChars.has(c))
      }
      
      if (eligible.length > 0) {
        const picked = eligible[Math.floor(Math.random() * eligible.length)]
        assignments[seatNum] = picked
        usedChars.add(picked)
      } else if (pool.length > 0) {
        const picked = pool[Math.floor(Math.random() * pool.length)]
        assignments[seatNum] = picked
      }
    }

    return assignments
  }

  function startNewGame() {
    if (!newGamePanel) return
    const slug = newGamePanel.scriptSlug
    if (onSelectScript) onSelectScript(slug)

    // Total seats = regular players + travelers
    const totalCount = newGamePanel.playerCount + newGamePanel.travelerCount
    const seats = createSeats(totalCount)
    
    // Mark travelers
    for (let i = newGamePanel.playerCount; i < totalCount; i++) {
      seats[i].isTraveler = true
    }

    // Apply names, characters, teams, and notes
    for (const seat of seats) {
      const sNum = seat.seat
      seat.name = newGamePanel.seatNames[sNum] || (seat.isTraveler ? `Traveler ${sNum}` : `Player ${sNum}`)
      
      if (!seat.isTraveler) {
        const cid = newGamePanel.assignments[sNum]
        const userCid = newGamePanel.userAssignments[sNum]
        seat.characterId = cid || null
        seat.userCharacterId = userCid || null
        
        // Auto-assign team tag based on actual character
        if (cid) {
          const char = characterById[cid]
          if (char) {
            if (char.team === 'minion' || char.team === 'demon') {
              seat.teamTag = 'evil'
            } else {
              seat.teamTag = 'good'
            }
          }
        }
      }
      
      seat.note = newGamePanel.seatNotes[sNum] || ''
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
    const teams: Record<number, 'evil' | 'good' | null> = {}
    for (const s of currentDay.seats) {
      teams[s.seat] = 'good'
    }
    setEndGameResult({
      winner: null,
      playerTeams: teams,
      mvp: null,
      balanced: null,
      funEvil: null,
      funGood: null,
      replay: null,
      otherNote: ''
    })
  }

  function confirmEndGame() {
    if (!endGameResult) return
    const summaries = currentDay.seats.map((s) => ({
      seat: s.seat,
      name: s.name,
      team: endGameResult.playerTeams[s.seat] ?? 'good',
    }))
    saveCurrentGame(
      endGameResult.winner,
      summaries,
      endGameResult.mvp,
      endGameResult.balanced,
      endGameResult.funEvil,
      endGameResult.funGood,
      endGameResult.replay,
      endGameResult.otherNote
    )
    resetCurrentGame()
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




  // Adding toggleConsoleSection here since it was moved inside RightConsole originally,
  // but it's used there as a callback, and it depends on setActiveConsoleSections.
  // Wait, in my previous refactor, RightConsole defined it locally!
  // BUT the returned object listed `toggleConsoleSection` and I left it there.
  // Let me just define it here to be safe and export it, then RightConsole won't complain if it receives it from ctx.


  return {
    activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions,
    days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool,
    pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber,
    showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, activeRightPopup, setActiveRightPopup, showScriptPanel, setShowScriptPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc,
    audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections,
    tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet,
    showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text,
    selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters,
    draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay,
    nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer,
    syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination,
    rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay,
    goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat,
    addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount,
    NIGHT_BGM_SRC, hasTimer, toggleConsoleSection
  }
}
