/**
 * BOTC terminology map — injected into every agent system prompt.
 * Ensures consistent EN↔ZH translation of game-specific terms.
 */

export const TERM_MAP_ZH: Record<string, string> = {
  'Storyteller':    '说书人',
  'Demon':          '恶魔',
  'Minion':         '爪牙',
  'Townsfolk':      '镇民',
  'Outsider':       '外来者',
  'Traveler':       '旅行者',
  'Fabled':         '传奇角色',
  'nominate':       '提名',
  'nomination':     '提名',
  'execute':        '处决',
  'execution':      '处决',
  'poison':         '中毒',
  'poisoned':       '中毒',
  'drunk':          '醉酒',
  'mad':            '疯狂',
  'madness':        '疯狂',
  'register as':    '登记为',
  'ghost vote':     '亡魂票',
  'dead vote':      '亡者票',
  'dead':           '已死亡',
  'alive':          '存活',
  'night':          '夜晚',
  'day':            '白天',
  'first night':    '第一夜',
  'other nights':   '其余夜晚',
  'ability':        '能力',
  'token':          '提示牌',
  'reminder':       '提示牌',
  'good team':      '好人阵营',
  'evil team':      '邪恶阵营',
  'win':            '获胜',
  'lose':           '落败',
  'vote':           '投票',
  'player':         '玩家',
  'neighbour':      '邻座',
  'neighbor':       '邻座',
  'clockwise':      '顺时针',
  'learn':          '得知',
  'choose':         '选择',
  'select':         '选择',
  'jinx':           '克制关系',
  'setup':          '游戏布置',
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
