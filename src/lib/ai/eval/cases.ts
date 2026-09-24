/**
 * AI evaluation cases (docs/AI-ARCHITECTURE-OFFLINE-FIRST.md §13).
 *
 * Each case is a question a user would ask in the AI panel, on a page
 * (general chat, a script, or a game), with checks that can be graded by
 * program: required / forbidden phrases, characters mentioned, and for
 * generation tasks a machine-readable final line that is validated against
 * the catalog (a script must be a valid character pool; a game setup must
 * match the official counts for the player count).
 *
 * `offline: true` marks questions the local no-model answerer must handle.
 */
import type { Team } from '../../../types'

export type EvalContext =
  | { kind: 'general' }
  | { kind: 'script'; slug: string }
  | { kind: 'game'; fixture: GameFixtureId }

export type GameFixtureId = 'scarlet-woman-6-alive' | 'mayor-3-alive' | 'four-alive-evil-close'

export type Check =
  /** At least one of the phrases (case-insensitive; strings or regex sources). */
  | { kind: 'includes'; any: string[]; label: string }
  /** None of the phrases. */
  | { kind: 'excludes'; any: string[]; label: string }
  /** Characters named in the answer (by id or display name). */
  | { kind: 'characters'; include?: string[]; exclude?: string[]; label: string }
  /** Final line "在场角色: …" / "Characters in play: …": a legal line-up for the player count from the script. */
  | { kind: 'setup'; script: string; players: number; label: string }
  /** Final line "剧本角色: …" / "Script characters: …" (or a create_script_draft call): a character pool. */
  | {
      kind: 'script'
      label: string
      include?: string[]
      noTeams?: Team[]
      editions?: string[]
      /** Inclusive ranges per team. */
      counts?: Partial<Record<Team, [number, number]>>
      /** Player counts the pool must be able to deal. */
      dealable?: number[]
    }

export type EvalCase = {
  id: string
  category: 'fact' | 'translation' | 'rules' | 'term' | 'setup' | 'script' | 'situation'
  difficulty: 'basic' | 'hard'
  language: 'zh' | 'en'
  context: EvalContext
  question: string
  checks: Check[]
  /** Answerable from local data without any model. */
  offline?: boolean
}

const general = { kind: 'general' } as const

export const EVAL_CASES: EvalCase[] = [
  // ── Facts ─────────────────────────────────────────────────────────────────
  {
    id: 'fact-ability-washerwoman', category: 'fact', difficulty: 'basic', language: 'zh', context: general, offline: true,
    question: '洗衣妇的能力是什么？',
    checks: [
      { kind: 'includes', any: ['两名玩家'], label: '说到两名玩家' },
      { kind: 'includes', any: ['镇民'], label: '说到镇民角色' },
      { kind: 'includes', any: ['首个夜晚', '第一个夜晚', '第一夜', '首夜'], label: '只在首夜得知' },
    ],
  },
  {
    id: 'fact-edition-count', category: 'fact', difficulty: 'basic', language: 'zh', context: general, offline: true,
    question: '奥德赛角色包一共有多少个角色？作者是谁？',
    checks: [
      { kind: 'includes', any: ['119'], label: '数量 119' },
      { kind: 'includes', any: ['太一'], label: '作者太一' },
    ],
  },
  {
    id: 'fact-roster-tb-minions', category: 'fact', difficulty: 'basic', language: 'zh', context: general, offline: true,
    question: '暗流涌动有哪些爪牙？',
    checks: [
      { kind: 'characters', include: ['poisoner', 'spy', 'scarletwoman', 'baron'], label: '四个爪牙齐全' },
      { kind: 'characters', exclude: ['godfather', 'devilsadvocate', 'assassin', 'mastermind', 'witch', 'cerenovus', 'pithag', 'eviltwin'], label: '没有混入其他版本的爪牙' },
    ],
  },
  {
    id: 'fact-jinx', category: 'fact', difficulty: 'basic', language: 'zh', context: general, offline: true,
    question: '瘟疫医生和间谍之间有什么相克规则？',
    checks: [
      { kind: 'includes', any: ['爪牙获得', '爪牙会获得', '一名爪牙'], label: '爪牙获得间谍能力' },
      { kind: 'includes', any: ['知晓', '得知', '知道'], label: '并得知此事' },
    ],
  },
  {
    id: 'fact-night-order', category: 'fact', difficulty: 'basic', language: 'zh', context: { kind: 'script', slug: 'tb' }, offline: true,
    question: '第一个夜晚，投毒者和洗衣妇谁先被唤醒？',
    checks: [
      { kind: 'includes', any: ['投毒者[^。\\n]{0,20}(先|早于|之前|在前|第一)', '(先|首先)[^。\\n]{0,12}投毒者', '洗衣妇[^。\\n]{0,20}(之后|后面|后于|较晚)'], label: '投毒者先' },
      { kind: 'excludes', any: ['洗衣妇[^。\\n]{0,12}(先被唤醒|先行动|先醒)'], label: '没说反' },
    ],
  },
  {
    id: 'fact-en-washerwoman', category: 'fact', difficulty: 'basic', language: 'en', context: general, offline: true,
    question: 'What does the Washerwoman learn?',
    checks: [
      { kind: 'includes', any: ['1 of 2 players', 'one of two players', 'two players'], label: 'two players' },
      { kind: 'includes', any: ['Townsfolk'], label: 'a Townsfolk' },
    ],
  },

  // ── Translation ───────────────────────────────────────────────────────────
  {
    id: 'translate-en-zh-imp', category: 'translation', difficulty: 'basic', language: 'zh', context: general, offline: true,
    question: '把这句能力翻译成中文：“Each night*, choose a player: they die. If you kill yourself this way, a Minion becomes the Imp.”',
    checks: [
      { kind: 'includes', any: ['每个夜晚\\*'], label: '保留“每个夜晚*”' },
      { kind: 'includes', any: ['他死亡'], label: '“他死亡”' },
      { kind: 'includes', any: ['变成小恶魔', '成为小恶魔'], label: '爪牙变成小恶魔' },
    ],
  },
  {
    id: 'translate-zh-en-washerwoman', category: 'translation', difficulty: 'basic', language: 'en', context: general, offline: true,
    question: 'Translate into English: “在你的首个夜晚，你会得知两名玩家和一个镇民角色：这两名玩家之一是该角色。”',
    checks: [
      { kind: 'includes', any: ['You start knowing'], label: 'official “You start knowing”' },
      { kind: 'includes', any: ['1 of 2 players', 'one of two players'], label: '1 of 2 players' },
      { kind: 'includes', any: ['Townsfolk'], label: 'Townsfolk' },
    ],
  },

  // ── Rules ─────────────────────────────────────────────────────────────────
  {
    id: 'rules-execution-threshold', category: 'rules', difficulty: 'basic', language: 'zh', context: general, offline: true,
    question: '6 个人存活的时候，处决至少需要几票？',
    checks: [
      { kind: 'includes', any: ['3 ?票', '三票'], label: '3 票' },
      { kind: 'excludes', any: ['(需要|至少)[^。\\n，,]{0,6}(4|四)\\s*票', '超过半数'], label: '没有得出 4 票 / 超过半数' },
    ],
  },
  {
    id: 'rules-dead-vote', category: 'rules', difficulty: 'basic', language: 'zh', context: general, offline: true,
    question: '死亡的玩家还能投票吗？',
    checks: [
      { kind: 'includes', any: ['一次', '1 次', '一票'], label: '只能再投一次' },
      { kind: 'excludes', any: ['^[^。\n]{0,12}(不能|无法|不可以)(再)?投票'], label: '没说死亡玩家完全不能投' },
    ],
  },
  {
    id: 'rules-evil-win', category: 'rules', difficulty: 'basic', language: 'zh', context: general, offline: true,
    question: '邪恶阵营怎样获胜？',
    checks: [
      { kind: 'includes', any: ['两名', '2 名', '两位', '2名', '两个'], label: '只剩两名存活玩家' },
      { kind: 'includes', any: ['旅行者'], label: '旅行者不计入' },
    ],
  },
  {
    id: 'rules-drunk-empath', category: 'rules', difficulty: 'basic', language: 'zh', context: general, offline: true,
    question: '醉酒的共情者晚上会得到什么信息？他自己知道吗？',
    checks: [
      { kind: 'includes', any: ['错误', '假的', '虚假'], label: '可能得到错误信息' },
      { kind: 'includes', any: ['不知道', '不会知道', '并不知道'], label: '自己不知道' },
    ],
  },
  {
    id: 'rules-setup-count-en', category: 'rules', difficulty: 'basic', language: 'en', context: general, offline: true,
    question: 'How many Outsiders are in play in a 9-player game by default?',
    checks: [{ kind: 'includes', any: ['\\b2\\b', 'two'], label: '2 Outsiders' }],
  },

  // ── Terms ─────────────────────────────────────────────────────────────────
  {
    id: 'term-night-star', category: 'term', difficulty: 'basic', language: 'zh', context: general, offline: true,
    question: '能力里写的“每个夜晚*”是什么意思？',
    checks: [{ kind: 'includes', any: ['除[^。\\n]{0,8}第一', '不包括第一', '第一个夜晚以外', '第一夜以外', '首个夜晚以外', '除首夜'], label: '除第一个夜晚外' }],
  },
  {
    id: 'term-register', category: 'term', difficulty: 'basic', language: 'zh', context: general, offline: true,
    question: '“登记为”是什么意思？登记为邪恶的善良玩家算哪个阵营？',
    checks: [
      { kind: 'includes', any: ['善良'], label: '仍是善良' },
      { kind: 'includes', any: ['视为', '当作', '算作', '被当作'], label: '只是被当作' },
    ],
  },

  // ── Game setup ────────────────────────────────────────────────────────────
  {
    id: 'setup-tb-7', category: 'setup', difficulty: 'basic', language: 'zh', context: { kind: 'script', slug: 'tb' }, offline: true,
    question: '我们 7 个人玩暗流涌动，帮我挑选这局的在场角色，并说明理由。最后单独一行用“在场角色: 角色id1, 角色id2, …”列出全部在场角色。',
    checks: [{ kind: 'setup', script: 'tb', players: 7, label: '7 人局配置合法' }],
  },
  {
    id: 'setup-tb-8-baron', category: 'setup', difficulty: 'hard', language: 'zh', context: { kind: 'script', slug: 'tb' }, offline: true,
    question: '暗流涌动 8 人局，我想让男爵在场，该怎么配？最后单独一行用“在场角色: 角色id1, 角色id2, …”列出全部在场角色。',
    checks: [
      { kind: 'setup', script: 'tb', players: 8, label: '8 人局 + 男爵配置合法' },
      { kind: 'characters', include: ['baron'], label: '男爵在场' },
    ],
  },

  // ── Script generation ─────────────────────────────────────────────────────
  {
    id: 'script-newbie-tb', category: 'script', difficulty: 'hard', language: 'zh', context: general, offline: true,
    question: '帮我设计一个适合新手的完整剧本（血染钟楼的剧本是角色清单），主要用暗流涌动的角色，必须包含洗衣妇和小恶魔，不要旅行者。最后单独一行用“剧本角色: 角色id1, 角色id2, …”列出剧本里的全部角色。',
    checks: [{
      kind: 'script', label: '合法的新手剧本',
      include: ['washerwoman', 'imp'], noTeams: ['traveler'],
      counts: { townsfolk: [11, 14], outsider: [3, 5], minion: [3, 5], demon: [1, 4] },
      dealable: [7, 8, 9, 10],
    }],
  },
  {
    id: 'script-teensy-odyssey', category: 'script', difficulty: 'hard', language: 'zh', context: general, offline: true,
    question: '只用奥德赛角色包的角色，设计一个适合 5–6 人的小型剧本（Teensyville）。最后单独一行用“剧本角色: 角色id1, 角色id2, …”列出剧本里的全部角色。',
    checks: [{
      kind: 'script', label: '奥德赛小型剧本',
      editions: ['odyssey'], noTeams: ['traveler'],
      counts: { townsfolk: [5, 8], outsider: [1, 3], minion: [1, 3], demon: [1, 3] },
      dealable: [5, 6],
    }],
  },

  // ── Game situations ───────────────────────────────────────────────────────
  {
    id: 'situation-scarlet-woman', category: 'situation', difficulty: 'hard', language: 'zh', context: { kind: 'game', fixture: 'scarlet-woman-6-alive' }, offline: true,
    question: '如果今天处决了 1 号（小恶魔），游戏会结束吗？',
    checks: [
      { kind: 'includes', any: ['红唇女郎'], label: '想到红唇女郎' },
      { kind: 'includes', any: ['变成[^。\\n]{0,6}恶魔', '成为[^。\\n]{0,6}恶魔'], label: '她变成恶魔' },
      { kind: 'includes', any: ['不会结束', '继续', '不会立即结束', '不结束'], label: '游戏继续' },
    ],
  },
  {
    id: 'situation-mayor', category: 'situation', difficulty: 'hard', language: 'zh', context: { kind: 'game', fixture: 'mayor-3-alive' }, offline: true,
    question: '现在只剩 3 名玩家存活。如果今天白天不处决任何人，会发生什么？',
    checks: [
      { kind: 'includes', any: ['镇长'], label: '想到镇长' },
      { kind: 'includes', any: ['善良[^。\\n]{0,8}(获胜|胜利|赢)', '好人[^。\\n]{0,8}(获胜|胜利|赢)', '镇长[^。\\n]{0,6}(获胜|胜利)'], label: '善良（镇长阵营）获胜' },
    ],
  },
  {
    id: 'situation-evil-close', category: 'situation', difficulty: 'hard', language: 'zh', context: { kind: 'game', fixture: 'four-alive-evil-close' }, offline: true,
    question: '现在存活 4 人。如果今天处决了一名善良玩家，今晚恶魔又杀了一人，结果会怎样？',
    checks: [
      { kind: 'includes', any: ['邪恶[^。\\n]{0,8}(获胜|胜利|赢)'], label: '邪恶获胜' },
      { kind: 'includes', any: ['两名', '2 名', '2名', '两人', '两位', '2 人'], label: '只剩两人' },
    ],
  },
]
