/**
 * BOTC terminology map — injected into agent system prompts and the MCP
 * translation tools. The Chinese side follows the official Chinese glossary
 * (集石 术语汇总, bundled as the "zh-glossary" page of public/wiki-chunks.json):
 * 相克 not 克制, 被当作 not 登记为, 首个夜晚 not 第一夜, 提示标记 not 提示牌.
 */

export const TERM_MAP_ZH: Record<string, string> = {
  'Storyteller':    '说书人',
  'Grimoire':       '魔典',
  'Demon':          '恶魔',
  'Minion':         '爪牙',
  'Townsfolk':      '镇民',
  'Outsider':       '外来者',
  'Traveller':      '旅行者',
  'Traveler':       '旅行者',
  'Fabled':         '传奇角色',
  'Loric':          '奇遇角色',
  'nominate':       '提名',
  'nomination':     '提名',
  'execute':        '处决',
  'execution':      '处决',
  'exile':          '流放',
  'poisoned':       '中毒',
  'drunk':          '醉酒',
  'sober':          '清醒',
  'healthy':        '健康',
  'mad':            '疯狂',
  'madness':        '疯狂',
  'register as':    '被当作',
  'vote token':     '投票标记',
  'ghost vote':     '投票标记',
  'dead':           '死亡',
  'alive':          '存活',
  'night':          '夜晚',
  'day':            '白天',
  'dusk':           '黄昏',
  'dawn':           '黎明',
  'first night':    '首个夜晚',
  'other nights':   '其他夜晚',
  'each night*':    '每个夜晚*',
  'once per game':  '每局游戏限一次',
  'Minion info':    '爪牙信息',
  'Demon info':     '恶魔信息',
  'in play':        '在场',
  'not in play':    '不在场',
  'ability':        '能力',
  'character token': '角色标记',
  'reminder token': '提示标记',
  'good':           '善良',
  'evil':           '邪恶',
  'alignment':      '阵营',
  'win':            '获胜',
  'lose':           '落败',
  'vote':           '投票',
  'player':         '玩家',
  'neighbours':     '与之邻近的玩家',
  'alive neighbours': '与之邻近的存活玩家',
  'learn':          '得知',
  'choose':         '选择',
  'might':          '可能',
  'jinx':           '相克规则',
  'setup':          '初始设置',
  'bluffs':         '恶魔伪装',
}

/** Build the glossary section injected into system prompts. */
export function buildGlossaryPrompt(targetLang: 'zh' | 'en' = 'zh'): string {
  if (targetLang === 'zh') {
    const lines = Object.entries(TERM_MAP_ZH)
      .map(([en, zh]) => `  ${en} → ${zh}`)
      .join('\n')
    return `BotC terminology (use these translations consistently):\n${lines}`
  }
  const lines = Object.entries(TERM_MAP_ZH)
    .map(([en, zh]) => `  ${zh} → ${en}`)
    .join('\n')
  return `BotC terminology (use these English terms consistently):\n${lines}`
}

/**
 * What players say → the words the rules use, for rules retrieval: a query
 * with "鬼票" should find the paragraph about dead players' votes. Each entry
 * adds its terms to a query that matches its pattern.
 */
const TERM_ALIASES: Array<[RegExp, string]> = [
  [/鬼票|死人票|亡魂票|亡者票|投票标记|ghost vote|dead vote|vote token/i, '死亡玩家 投票 一次 dead player vote once'],
  [/登记|当作|register/i, '登记为 被当作 registers as'],
  [/首夜|第一夜|第一晚|头一晚|首个夜晚/, '第一个夜晚 首个夜晚 first night'],
  [/醉(?!酒)/, '醉酒'],
  [/毒(?!者)|被毒/, '中毒'],
  [/票数|几票|多少票|过半|半数/, '处决 票数 一半 存活玩家'],
  [/平票|同票|\btie\b/i, '平票 无人被处决 tie'],
  [/恶魔伪装|伪装角色|三个伪装|demon bluffs?/i, '恶魔信息 不在场 善良角色 伪装'],
  [/邪恶赢|坏人赢|好人赢|胜利条件|怎么赢/, '获胜 善良阵营 邪恶阵营 两名玩家存活'],
  [/好人/, '善良'],
  [/坏人/, '邪恶'],
  [/起死回生|复活/, '复活 死亡'],
]

/** The query with the rules' own words for any player wording it contains. */
export function expandTermAliases(query: string): string {
  const extra = TERM_ALIASES.filter(([pattern]) => pattern.test(query)).map(([, terms]) => terms)
  return extra.length ? `${query} ${extra.join(' ')}` : query
}
