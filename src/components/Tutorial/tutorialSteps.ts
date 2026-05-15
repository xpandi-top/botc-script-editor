export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

export type TutorialStep = {
  id: string
  title: { en: string; zh: string }
  body: { en: string; zh: string }
  targetSelector?: string
  tabToActivate?: string
  tooltipPlacement?: TooltipPlacement
  scrollToTarget?: boolean
}

export const DESKTOP_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: { en: 'Welcome to BOTC Companion!', zh: '欢迎使用 BOTC Companion！' },
    body: {
      en: 'Your script viewer, storyteller assistant, and game tracker — all in one place.',
      zh: '你的剧本查看器、说书人助手和游戏追踪器，尽在一处。',
    },
    tooltipPlacement: 'center',
  },
  {
    id: 'scripts-tab',
    title: { en: 'Scripts Tab', zh: '剧本页' },
    body: {
      en: 'Browse all official and community scripts.',
      zh: '浏览所有官方和社区剧本。',
    },
    tabToActivate: 'scripts',
    targetSelector: '[role="tab"][value="scripts"]',
    tooltipPlacement: 'bottom',
  },
  {
    id: 'script-list',
    title: { en: 'Script List', zh: '剧本列表' },
    body: {
      en: 'Click any script to view its full character sheet.',
      zh: '点击任意剧本以查看完整角色卡片。',
    },
    targetSelector: '.MuiBox-root[role="button"]',
    tooltipPlacement: 'right',
    scrollToTarget: true,
  },
  {
    id: 'search-box',
    title: { en: 'Search Scripts', zh: '搜索剧本' },
    body: {
      en: 'Search scripts by name or character.',
      zh: '按名称或角色搜索剧本。',
    },
    targetSelector: '[data-tutorial="script-search"]',
    tooltipPlacement: 'bottom',
  },
  {
    id: 'info-button',
    title: { en: 'Info & Changelog', zh: '说明与更新日志' },
    body: {
      en: 'Each tab has a description and the changelog here.',
      zh: '每个页面在此处都有说明和更新日志。',
    },
    targetSelector: '[data-tutorial="info-btn"]',
    tooltipPlacement: 'bottom',
  },
  {
    id: 'characters-tab',
    title: { en: 'Characters Tab', zh: '角色页' },
    body: {
      en: 'Browse all abilities, revisions, and jinxes.',
      zh: '浏览所有能力、版本记录和互克关系。',
    },
    tabToActivate: 'characters',
    targetSelector: '[role="tab"][value="characters"]',
    tooltipPlacement: 'bottom',
  },
  {
    id: 'storyteller-tab',
    title: { en: 'Storyteller Helper', zh: '主持助手' },
    body: {
      en: 'Run a full game — night phases, timers, nominations, seat management.',
      zh: '运行完整游戏 —— 夜晚阶段、计时器、提名和座位管理。',
    },
    tabToActivate: 'storyteller',
    targetSelector: '[role="tab"][value="storyteller"]',
    tooltipPlacement: 'bottom',
  },
  {
    id: 'analytics-tab',
    title: { en: 'Analytics', zh: '数据统计' },
    body: {
      en: 'Log every game and track win rates, player stats, and ratings.',
      zh: '记录每场游戏，追踪胜率、玩家数据和评分。',
    },
    tabToActivate: 'analytics',
    targetSelector: '[role="tab"][value="analytics"]',
    tooltipPlacement: 'bottom',
  },
  {
    id: 'settings-tab',
    title: { en: 'Re-open Tutorial', zh: '重新打开教程' },
    body: {
      en: 'You can re-open this tutorial anytime from the ℹ️ info button.',
      zh: '你可以随时通过 ℹ️ 信息按钮重新打开本教程。',
    },
    tooltipPlacement: 'center',
  },
  {
    id: 'done',
    title: { en: "You're all set!", zh: '准备就绪！' },
    body: {
      en: 'Enjoy BOTC Companion.',
      zh: '尽情享用 BOTC Companion 吧！',
    },
    tooltipPlacement: 'center',
  },
]

export const MOBILE_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: { en: 'Welcome to BOTC Companion!', zh: '欢迎使用 BOTC Companion！' },
    body: {
      en: 'Your script viewer, storyteller assistant, and game tracker — all in one place.',
      zh: '你的剧本查看器、说书人助手和游戏追踪器，尽在一处。',
    },
    tooltipPlacement: 'center',
  },
  {
    id: 'mobile-tabs',
    title: { en: 'Navigation', zh: '导航' },
    body: {
      en: 'Use the bottom bar to switch between Scripts, Storyteller Helper, and Analytics.',
      zh: '使用底部导航栏切换剧本、主持助手和数据统计。',
    },
    targetSelector: '.MuiBottomNavigation-root',
    tooltipPlacement: 'top',
  },
  {
    id: 'done',
    title: { en: "You're all set!", zh: '准备就绪！' },
    body: {
      en: 'Enjoy BOTC Companion.',
      zh: '尽情享用 BOTC Companion 吧！',
    },
    tooltipPlacement: 'center',
  },
]

export const TUTORIAL_KEY = 'botc-tutorial-done'
