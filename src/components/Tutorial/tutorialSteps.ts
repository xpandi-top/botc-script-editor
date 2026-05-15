import type { ElementType } from 'react'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import DescriptionIcon from '@mui/icons-material/Description'
import SearchIcon from '@mui/icons-material/Search'
import InfoIcon from '@mui/icons-material/Info'
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import GroupsIcon from '@mui/icons-material/Groups'
import BedtimeIcon from '@mui/icons-material/Bedtime'
import SaveIcon from '@mui/icons-material/Save'
import QueryStatsIcon from '@mui/icons-material/QueryStats'
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

export type TutorialStep = {
  id: string
  title: { en: string; zh: string }
  body: { en: string; zh: string }
  icon?: ElementType
  targetSelector?: string
  tabToActivate?: string
  tooltipPlacement?: TooltipPlacement
  scrollToTarget?: boolean
}

export const DESKTOP_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    icon: EmojiEventsIcon,
    title: { en: 'Welcome to BOTC Companion!', zh: '欢迎使用 BOTC Companion！' },
    body: {
      en: 'Script viewer, storyteller assistant, and game tracker — all in one.',
      zh: '剧本查看、说书助手、游戏记录，一站搞定。',
    },
    tooltipPlacement: 'center',
  },
  {
    id: 'scripts-tab',
    icon: DescriptionIcon,
    title: { en: 'Scripts Tab', zh: '剧本' },
    body: {
      en: 'Browse hundreds of official, community, and custom scripts.',
      zh: '浏览官方、社区和自制剧本。',
    },
    tabToActivate: 'scripts',
    targetSelector: '[data-tutorial="tab-scripts"]',
    tooltipPlacement: 'bottom',
  },
  {
    id: 'script-search',
    icon: SearchIcon,
    title: { en: 'Search & Filter', zh: '搜索与筛选' },
    body: {
      en: 'Search by script name or character name. Filter by tag: Favorite, Good, Bad, Excellent.',
      zh: '按剧本名或角色名搜索，按标签筛选：收藏、好玩、较差、优秀。',
    },
    targetSelector: '[data-tutorial="script-search"]',
    tooltipPlacement: 'bottom',
  },
  {
    id: 'info-button',
    icon: InfoIcon,
    title: { en: 'Info & Changelog', zh: '说明与更新日志' },
    body: {
      en: 'Each tab has a description here, plus the changelog and this tutorial.',
      zh: '此处有每个页签的说明、更新日志和本教程。',
    },
    targetSelector: '[data-tutorial="info-btn"]',
    tooltipPlacement: 'bottom',
  },
  {
    id: 'characters-tab',
    icon: TheaterComedyIcon,
    title: { en: 'Characters', zh: '角色' },
    body: {
      en: 'Browse all characters with abilities, revisions, and jinxes. Upload custom character packs.',
      zh: '浏览所有角色的能力、版本记录和互克关系，并支持上传自定义角色包。',
    },
    tabToActivate: 'characters',
    targetSelector: '[data-tutorial="tab-characters"]',
    tooltipPlacement: 'bottom',
  },
  {
    id: 'storyteller-intro',
    icon: MenuBookIcon,
    title: { en: 'Storyteller Helper', zh: '主持助手' },
    body: {
      en: 'Full game orchestration: seat assignment, night phases, timers, nominations, and vote tracking.',
      zh: '完整游戏主持工具：分配座位、夜晚阶段、计时器、提名和投票追踪。',
    },
    targetSelector: '[data-tutorial="tab-storyteller"]',
    tooltipPlacement: 'bottom',
  },
  {
    id: 'st-new-game',
    icon: AddCircleOutlinedIcon,
    title: { en: 'Start a New Game', zh: '开始新游戏' },
    body: {
      en: 'Tap the ⊕ button to set up players, assign a script, and begin. You can also edit the game mid-session.',
      zh: '点击 ⊕ 按钮配置玩家、选择剧本并开始游戏。游戏进行中也可随时编辑。',
    },
    tabToActivate: 'storyteller',
    targetSelector: '[data-tutorial="st-new-game-btn"]',
    tooltipPlacement: 'top',
  },
  {
    id: 'st-arena',
    icon: GroupsIcon,
    title: { en: 'Arena — Seat Circle', zh: '游戏圈' },
    body: {
      en: 'All players appear here. Tap a seat to assign roles, add tags (drunk/poisoned/protected), or log skills.',
      zh: '所有玩家显示于此。点击座位可分配角色、添加标签（醉鬼/中毒/受保护）或记录技能。',
    },
    targetSelector: '[data-tutorial="st-arena"]',
    tooltipPlacement: 'top',
  },
  {
    id: 'st-phase-panel',
    icon: BedtimeIcon,
    title: { en: 'Phase Control', zh: '阶段控制' },
    body: {
      en: 'Switch between Night, Private chat, Public chat, and Nomination phases. Each phase changes the arena display and available actions.',
      zh: '在夜晚、私聊、公聊和提名阶段之间切换。每个阶段改变场景显示和可用操作。',
    },
    targetSelector: '[data-tutorial="st-phase-panel"]',
    tooltipPlacement: 'top',
  },
  {
    id: 'st-save-btn',
    icon: SaveIcon,
    title: { en: 'Save Game Record', zh: '保存游戏记录' },
    body: {
      en: 'After the game ends, tap 💾 to save the result, MVP, ratings, and player summaries to Analytics.',
      zh: '游戏结束后，点击 💾 保存结果、MVP、评分和玩家摘要到数据统计。',
    },
    targetSelector: '[data-tutorial="st-save-btn"]',
    tooltipPlacement: 'top',
  },
  {
    id: 'analytics-intro',
    icon: QueryStatsIcon,
    title: { en: 'Analytics', zh: '数据统计' },
    body: {
      en: 'Every saved game appears here. Track win rates, play counts, script popularity, and player performance over time.',
      zh: '所有保存的游戏记录于此。追踪胜率、场次、剧本热度和玩家表现。',
    },
    targetSelector: '[data-tutorial="tab-analytics"]',
    tooltipPlacement: 'bottom',
  },
  {
    id: 'an-add-record',
    icon: AddCircleOutlinedIcon,
    title: { en: 'Add a Record', zh: '添加记录' },
    body: {
      en: 'Quickly log a game: pick a script, set winner, add players, rate balance and fun. Import/export JSON for backup.',
      zh: '快速记录游戏：选剧本、设结果、添加玩家、评分。支持 JSON 导入导出备份。',
    },
    tabToActivate: 'analytics',
    targetSelector: '[data-tutorial="an-add-record"]',
    tooltipPlacement: 'bottom',
  },
  {
    id: 'an-records-table',
    icon: QueryStatsIcon,
    title: { en: 'Records Table', zh: '记录列表' },
    body: {
      en: 'Click any row to expand it — see player details, day stats, MVP, and quick-edit ratings without opening the full form.',
      zh: '点击任一行展开详情：玩家信息、天数统计、MVP，以及内联快速编辑评分。',
    },
    targetSelector: '[data-tutorial="an-records-table"]',
    tooltipPlacement: 'top',
  },
  {
    id: 'done',
    icon: CheckCircleOutlineIcon,
    title: { en: "You're all set!", zh: '准备就绪！' },
    body: {
      en: "Re-open this tutorial anytime from the ℹ️ info button → Tutorial. Enjoy BOTC Companion!",
      zh: '随时可通过 ℹ️ 信息按钮 → 教程重新打开。尽情享用 BOTC Companion！',
    },
    tooltipPlacement: 'center',
  },
]

export const MOBILE_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    icon: EmojiEventsIcon,
    title: { en: 'Welcome to BOTC Companion!', zh: '欢迎使用 BOTC Companion！' },
    body: {
      en: 'Script viewer, storyteller assistant, and game tracker — all in one.',
      zh: '剧本查看、说书助手、游戏记录，一站搞定。',
    },
    tooltipPlacement: 'center',
  },
  {
    id: 'mobile-tabs',
    icon: DescriptionIcon,
    title: { en: 'Navigate', zh: '导航' },
    body: {
      en: 'Use the bottom bar: Scripts for script sheet, ST for game hosting, Stats for records.',
      zh: '底部栏切换：剧本查看、主持助手（ST）、数据统计。',
    },
    targetSelector: '.MuiBottomNavigation-root',
    tooltipPlacement: 'top',
  },
  {
    id: 'mobile-st',
    icon: MenuBookIcon,
    title: { en: 'Storyteller Helper', zh: '主持助手' },
    body: {
      en: 'Tap ⊕ to start a game. The phase panel at the bottom controls night, timer, and nominations.',
      zh: '点击 ⊕ 开始游戏。底部阶段面板控制夜晚、计时和提名。',
    },
    tabToActivate: 'storyteller',
    targetSelector: '[data-tutorial="st-new-game-btn"]',
    tooltipPlacement: 'top',
  },
  {
    id: 'mobile-analytics',
    icon: QueryStatsIcon,
    title: { en: 'Analytics', zh: '数据统计' },
    body: {
      en: 'Tap + to log a completed game. View all records and track your stats.',
      zh: '点击 + 记录已完成的游戏，查看所有记录和统计数据。',
    },
    tabToActivate: 'analytics',
    targetSelector: '[data-tutorial="an-add-record"]',
    tooltipPlacement: 'bottom',
  },
  {
    id: 'done',
    icon: CheckCircleOutlineIcon,
    title: { en: "You're all set!", zh: '准备就绪！' },
    body: {
      en: "Re-open this tutorial anytime from the ℹ️ info button → Tutorial. Enjoy BOTC Companion!",
      zh: '随时可通过 ℹ️ 信息按钮 → 教程重新打开。尽情享用 BOTC Companion！',
    },
    tooltipPlacement: 'center',
  },
]

export const TUTORIAL_KEY = 'botc-tutorial-done'
