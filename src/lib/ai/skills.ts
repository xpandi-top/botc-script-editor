/**
 * Skill definitions — pure data, NO React imports.
 * Icons are string identifiers mapped to MUI components in the UI layer.
 */

import type { AiContext, AiContextType } from './types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SkillDef = {
  id: string
  icon: string            // icon identifier string, NOT ReactNode
  label: string
  labelZh: string
  desc: string
  descZh: string
  forContexts: AiContextType[]
  chip?: boolean
  prompt: (ctx: AiContext) => string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function field(ctx: AiContext, key: string): unknown {
  return ctx.fields.find((f) => f.key === key)?.value
}

function strField(ctx: AiContext, key: string, fallback = ''): string {
  const v = field(ctx, key)
  return v !== undefined && v !== null && v !== '' ? String(v) : fallback
}

// ── Shared prompt fragments ───────────────────────────────────────────────────

/** Injected into every translation prompt. Keeps key BOTC terms consistent. */
const TERM_TABLE_EN_ZH = `REQUIRED TERMINOLOGY (never substitute):
  Townsfolk → 镇民 | Outsider → 外来者 | Minion → 爪牙 | Demon → 恶魔
  Storyteller → 说书人 | drunk → 醉酒 | poisoned → 中毒
  first night → 第一夜 | other nights → 其他夜晚 | each night → 每夜
  once per game → 每局游戏一次 | register as → 显示为 | might → 可能
  learns → 得知 | alive → 存活 | dead → 死亡 | execute → 处决
  nominate → 提名 | traveler → 旅行者 | ability → 能力`

/** Reminder for local-model-targeted prompts: keep output short and deterministic. */
const CONCISE_NOTE = `Keep your response concise. Do not add flavor text. Do not explain the game rules unless asked.`

/** Standard BOTC ability style rules. */
const ABILITY_STYLE_RULES = `BOTC ability text rules:
- 1–3 sentences maximum
- Clear trigger (when?), clear target (who?), clear effect (what?)
- Must be mechanically testable — no vague effects
- State drunk/poisoned behavior only if non-obvious
- "might" = uncertain outcome; "may" = player choice — use precisely
- Avoid "each night*" on Demons (they already kill nightly)
- Night reminder = terse ST instruction, NOT the ability text`

// ── Skill definitions ─────────────────────────────────────────────────────────

export const SKILLS: SkillDef[] = [

  // ── Character: Translation ──────────────────────────────────────────────────

  {
    id: 'translate-zh',
    icon: 'translate',
    label: 'Translate → ZH',
    labelZh: '翻译为中文',
    desc: 'Translate English ability text into Chinese, preserving all rules mechanics.',
    descZh: '将英文能力文本翻译成中文，保留所有规则机制。',
    forContexts: ['character'],
    chip: true,
    prompt: (ctx) => {
      const ab   = strField(ctx, 'abilityEn')
      const name = strField(ctx, 'nameEn', 'this character')
      if (!ab) return '将 abilityEn 字段中的英文能力文本翻译成中文，填写 abilityZh。保留所有时机、条件、目标和措辞。'
      return `Translate this BOTC ability text into Chinese. Fill the \`abilityZh\` field.

Ability (EN): "${ab}"
Character: ${name}

${TERM_TABLE_EN_ZH}

Translation rules:
- Preserve EXACT timing ("first night", "each night", "once per game")
- Preserve EXACT conditions and targets
- Preserve uncertainty wording ("might" → "可能", "may" → "可以")
- Preserve mandatory vs optional ("you learn" vs "you may learn")
- Do NOT prioritize literary style — prioritize rules accuracy
- Do NOT add or remove any mechanical clause
- If a clause has no clean Chinese equivalent, keep the meaning literal

${CONCISE_NOTE}`
    },
  },

  {
    id: 'translate-en',
    icon: 'translate',
    label: 'Translate → EN',
    labelZh: '翻译为英文',
    desc: 'Translate Chinese ability text into English, preserving all rules mechanics.',
    descZh: '将中文能力文本翻译成英文，保留所有规则机制。',
    forContexts: ['character'],
    chip: false,
    prompt: (ctx) => {
      const ab   = strField(ctx, 'abilityZh')
      const name = strField(ctx, 'nameEn', 'this character')
      if (!ab) return 'Translate the Chinese ability text in abilityZh to English. Fill the `abilityEn` field. Preserve all timing, conditions, and mechanics exactly.'
      return `Translate this BOTC ability text from Chinese to English. Fill the \`abilityEn\` field.

Ability (ZH): "${ab}"
Character: ${name}

${TERM_TABLE_EN_ZH}

Translation rules:
- Preserve EXACT timing (第一夜 → "first night", 每夜 → "each night")
- Preserve EXACT conditions and targets
- Preserve uncertainty (可能 → "might", 可以 → "may")
- Match official BOTC EN wording style ("You learn…", "Each night, choose…")
- Do NOT add flavor text or explanation
- Do NOT alter any mechanical clause

${CONCISE_NOTE}`
    },
  },

  // ── Character: Design ───────────────────────────────────────────────────────

  {
    id: 'suggest-ability',
    icon: 'lightbulb',
    label: 'Suggest ability',
    labelZh: '建议能力文本',
    desc: 'Generate a BotC-style ability based on name, team, and context.',
    descZh: '根据名字、阵营和上下文生成 BotC 风格的能力文本。',
    forContexts: ['character'],
    chip: true,
    prompt: (ctx) => {
      const name    = strField(ctx, 'nameEn', 'this character')
      const team    = strField(ctx, 'team', 'townsfolk')
      const edition = strField(ctx, 'edition')
      const existingZh = strField(ctx, 'abilityZh')

      const teamGuide: Record<string, string> = {
        townsfolk: 'Provide information or protection. Should feel useful but not solve the game alone. Information should be true (unless drunk/poisoned).',
        outsider:  'Good alignment, but ability is a drawback or creates confusion for good players. Should not actively help evil.',
        minion:    'Evil support. Help the Demon survive, bluff, kill key targets, or mislead good players.',
        demon:     'Primary evil threat. Kill at night. Ability shapes the script meta. Avoid "each night*" — Demons already kill.',
        traveler:  'Neutral. Unique setup rules. Can be exiled. Ability is limited or situational.',
        fabled:    'Storyteller-controlled. Modifies game balance or rules. Used during setup, not as a player role.',
      }

      return `Design a BOTC ability text for a ${team} character named "${name}".${edition ? ` Edition: ${edition}.` : ''}

Team design guidance for ${team}:
${teamGuide[team] ?? 'Design a balanced ability appropriate for BOTC.'}

${ABILITY_STYLE_RULES}

Fill the \`abilityEn\` field with 1–3 sentences.${existingZh ? `\nAlso provide a Chinese translation in \`abilityZh\` using the terminology table:\n${TERM_TABLE_EN_ZH}` : ''}

Consider:
- What information economy does this create?
- How does it interact when drunk or poisoned?
- What can evil players use as a bluff?
- Does it create interesting storyteller decisions?

${CONCISE_NOTE}`
    },
  },

  {
    id: 'chinese-name',
    icon: 'abc',
    label: 'Chinese name',
    labelZh: '建议中文名',
    desc: 'Suggest a 2–4 character Chinese name that reflects the character\'s flavor and mechanics.',
    descZh: '建议反映角色风格和机制的 2–4 字中文名。',
    forContexts: ['character'],
    chip: true,
    prompt: (ctx) => {
      const name    = strField(ctx, 'nameEn', 'this character')
      const ability = strField(ctx, 'abilityEn')
      const team    = strField(ctx, 'team')
      return `Suggest a Chinese name for a BOTC character. Fill the \`nameZh\` field.

English name: "${name}"${team ? `\nTeam: ${team}` : ''}${ability ? `\nAbility: "${ability}"` : ''}

Rules:
- 2–4 Chinese characters
- Reflect the character's flavor, mechanics, or thematic role
- Do NOT transliterate phonetically — translate the concept
- Match the tone of official BotC character names (e.g., 洗衣妇, 隐士, 恶魔, 毒师)
- If multiple options are reasonable, suggest 2–3 alternatives in the message

Fill \`nameZh\` with the best option.
${CONCISE_NOTE}`
    },
  },

  {
    id: 'full-character',
    icon: 'autofix',
    label: 'Full character',
    labelZh: '生成完整角色',
    desc: 'Generate a complete character draft — all fields including ability, name, reminders.',
    descZh: '生成完整角色草稿：所有字段含能力、名称、提示词。',
    forContexts: ['character'],
    chip: true,
    prompt: (ctx) => {
      const team    = strField(ctx, 'team', 'townsfolk')
      const nameEn  = strField(ctx, 'nameEn')
      const edition = strField(ctx, 'edition')

      return `Generate a complete BOTC custom character.${nameEn ? ` Character name: "${nameEn}".` : ''} Team: ${team}.${edition ? ` Edition: ${edition}.` : ''}

Fill ALL of these fields:
- \`nameEn\`: English name (if not provided, invent one)
- \`nameZh\`: 2–4 character Chinese name (conceptual, not phonetic)
- \`abilityEn\`: 1–3 sentence BOTC-style ability text
- \`abilityZh\`: Chinese translation of the ability (rules-accurate, not literary)
- \`firstNightReminder\`: Terse ST instruction for first night (empty string if not applicable)
- \`otherNightReminder\`: Terse ST instruction for other nights (empty string if not applicable)

${ABILITY_STYLE_RULES}

${TERM_TABLE_EN_ZH}

Design constraints:
- Ability must fit the ${team} design role
- Night reminders must match the ability — write as terse ST commands (e.g. "Wake. Point to player.")
- Chinese ability must be mechanically equivalent to English — not a paraphrase

${CONCISE_NOTE}`
    },
  },

  {
    id: 'night-reminders',
    icon: 'nights',
    label: 'Night reminders',
    labelZh: '夜间提示',
    desc: 'Write precise ST night reminder instructions for first and other nights.',
    descZh: '为说书人撰写第一夜和其他夜晚的精确提示词。',
    forContexts: ['character'],
    chip: false,
    prompt: (ctx) => {
      const name    = strField(ctx, 'nameEn', 'this character')
      const ability = strField(ctx, 'abilityEn')
      const fn      = strField(ctx, 'firstNightReminder')
      const on      = strField(ctx, 'otherNightReminder')

      return `Write night reminder text for BOTC character "${name}". Fill \`firstNightReminder\` and \`otherNightReminder\`.${ability ? `\n\nAbility: "${ability}"` : ''}
${fn ? `\nCurrent firstNightReminder: "${fn}"` : ''}
${on ? `\nCurrent otherNightReminder: "${on}"` : ''}

Night reminder format:
- Written for the Storyteller, NOT the player
- Terse imperative sentences only (e.g. "Wake. Point to a player. They learn yes/no.")
- If character does NOT act on a given night, set that field to empty string ""
- Do NOT copy the ability text — reminders are operational ST notes
- Include what token to place (if any), what information to give, and how to deliver it

Fill both fields. If a night is inapplicable, set to "".
${CONCISE_NOTE}`
    },
  },

  // ── Character: Review & Analysis ────────────────────────────────────────────

  {
    id: 'review-char',
    icon: 'rate_review',
    label: 'Review character',
    labelZh: '检查角色设计',
    desc: 'Structured review: balance, clarity, BotC conventions, and edge cases.',
    descZh: '结构化审查：平衡性、清晰度、BotC 规范和边缘情况。',
    forContexts: ['character'],
    chip: false,
    prompt: (ctx) => {
      const name    = strField(ctx, 'nameEn', 'this character')
      const team    = strField(ctx, 'team')
      const ability = strField(ctx, 'abilityEn')
      const abilZh  = strField(ctx, 'abilityZh')

      return `Review this BOTC character design. Return only a \`message\` (no fills needed).

Character: ${name}${team ? ` | Team: ${team}` : ''}
Ability (EN): ${ability || '(empty)'}${abilZh ? `\nAbility (ZH): ${abilZh}` : ''}

Structure your review with these sections (use ## headings):

## Power Level
Is this ability appropriately strong for a ${team || 'BOTC character'}? Over/underpowered?

## Clarity
Is the ability text unambiguous? Any edge cases with timing, targets, or trigger conditions?

## Drunk/Poisoned Behavior
What happens when this character is drunk or poisoned? Is it implicit or does it need an explicit clause?

## Night Order
Is a first/other night wake appropriate? Is the night order position sensible?

## Script Fit
What scripts would this character suit or break? Does it create interesting information economy or evil bluff space?

## Wording Issues
Any non-standard terminology, overly long text, or BOTC style violations?

## Verdict
One sentence summary: design works / needs revision / has a fundamental problem.

Be specific and analytical. No generic encouragement. Flag real issues.`
    },
  },

  {
    id: 'bilingual-consistency',
    icon: 'compare',
    label: 'Bilingual check',
    labelZh: '双语一致性检查',
    desc: 'Check that English and Chinese ability texts are mechanically equivalent.',
    descZh: '检查英中文能力文本在规则机制上是否完全一致。',
    forContexts: ['character'],
    chip: false,
    prompt: (ctx) => {
      const name   = strField(ctx, 'nameEn', 'this character')
      const abEn   = strField(ctx, 'abilityEn')
      const abZh   = strField(ctx, 'abilityZh')

      if (!abEn || !abZh) {
        return 'Both abilityEn and abilityZh must be filled before running a bilingual consistency check. Please fill both fields first.'
      }

      return `Check bilingual consistency for BOTC character "${name}". Return only a \`message\`.

Ability (EN): "${abEn}"
Ability (ZH): "${abZh}"

Compare EVERY clause between the two versions. Check:

1. **Timing**: Same night (first/other/each)? Same timing trigger?
2. **Conditions**: All if/when/while conditions present in both?
3. **Targets**: Same target constraints (player count, alive/dead, team)?
4. **Mandatory vs Optional**: "you learn" vs "you may learn" — consistent?
5. **Uncertainty**: "might" (可能) vs definite statements — consistent?
6. **Registration**: "register as" (显示为) clauses present in both?
7. **Once per game**: Frequency modifiers consistent?
8. **Quantity/Number**: Same counts in both versions?

For each discrepancy found:
- Quote the EN clause
- Quote the ZH clause
- State what differs

If no discrepancies: confirm they are mechanically equivalent.
Be precise. This is a rules accuracy audit, not a style review.`
    },
  },

  {
    id: 'rules-check',
    icon: 'gavel',
    label: 'Rules check',
    labelZh: '规则合法性检查',
    desc: 'Check the ability for illegal interactions, ambiguity, or rulebook violations.',
    descZh: '检查能力是否存在非法交互、歧义或规则违规。',
    forContexts: ['character'],
    chip: false,
    prompt: (ctx) => {
      const name    = strField(ctx, 'nameEn', 'this character')
      const team    = strField(ctx, 'team')
      const ability = strField(ctx, 'abilityEn')

      return `Check this BOTC ability for rules compliance and mechanical problems. Return only a \`message\`.

Character: ${name}${team ? ` (${team})` : ''}
Ability: "${ability || '(empty)'}"

Check for:

1. **Ambiguous timing** — Is it clear WHEN this ability triggers? Could it be interpreted multiple ways?
2. **Undefined targets** — Are valid targets fully specified? Could edge cases arise (dead players, travelers, etc.)?
3. **Drunk/poisoned gap** — Does this ability need an explicit clause for when drunk/poisoned? (Most abilities are implicitly affected, but some need explicit text.)
4. **Infinite loops** — Could this ability create circular interactions with common roles (Mathematician, Ravenkeeper, etc.)?
5. **Demon/Minion kill interaction** — If this character affects deaths or nominations, does it interact cleanly with existing kill mechanics?
6. **ST bookkeeping burden** — Is the Storyteller required to track too many states? Is execution feasible at the table?
7. **Information leak** — For townsfolk/outsider: could this ability confirm roles in a way that trivializes the game?
8. **Evil equivalent** — What would a ${team === 'demon' || team === 'minion' ? 'good' : 'evil'} player bluff as this character?

Flag every issue found. If none, say so.
Do not invent official rulings. Only evaluate the ability text as written.`
    },
  },

  // ── Script skills ───────────────────────────────────────────────────────────

  {
    id: 'analyze-script',
    icon: 'article',
    label: 'Analyze script',
    labelZh: '分析剧本',
    desc: 'Deep analysis: information density, evil threats, balance, and storyteller complexity.',
    descZh: '深度分析：信息密度、邪恶威胁、平衡性和说书人复杂度。',
    forContexts: ['script'],
    chip: true,
    prompt: (ctx) => {
      const title   = strField(ctx, 'title', 'this script')
      const teamBkd = strField(ctx, 'teamBreakdown')
      const count   = strField(ctx, 'characterCount')

      return `Analyze this BOTC script. Return only a \`message\` with structured sections.

Script: "${title}"${count ? ` (${count} characters)` : ''}${teamBkd ? `\nComposition: ${teamBkd}` : ''}

Use these sections (## headings):

## Information Density
Which characters produce information? How reliable is it? Can evil poison/corrupt key info sources?

## Evil Bluff Space
What roles can Minions/Demon safely bluff as? How wide is the bluff pool? Does evil have enough cover?

## Poisoning / Drunk Pressure
Which drunk-givers or poisoners are in the script? How does this affect trust in information?

## Execution Pressure
What forces good to execute? What creates hesitation? How easy is it for evil to delay executions?

## Death Sources
What kills outside of Demon kills? Are there execution traps? How many deaths per game?

## Confirmation Chains
Which roles can confirm each other? Can good form reliable confirmation chains?

## Storyteller Difficulty
What is the most complex ruling this script requires? How much bookkeeping does the ST face?

## Good Win Conditions
What does the good team need to do to win? What information is essential?

## Evil Win Conditions
What does evil need to do? How do they survive to endgame?

## Verdict
Overall script balance and difficulty rating (beginner / intermediate / advanced). One sentence.

Base all analysis ONLY on the character list provided in context. Do not reference characters not in this script.`
    },
  },

  {
    id: 'script-strategy',
    icon: 'psychology',
    label: 'Script strategy',
    labelZh: '剧本策略',
    desc: 'Player strategy guide: what to claim, what to find, what to fear.',
    descZh: '玩家策略指南：声称什么、找什么、怕什么。',
    forContexts: ['script'],
    chip: false,
    prompt: (ctx) => {
      const title = strField(ctx, 'title', 'this script')
      return `Write a player strategy guide for the BOTC script "${title}". Return only a \`message\`.

Structure with ## headings:

## Good Team Priorities
What should good players focus on finding or confirming first?
Which information sources are most valuable?

## Roles to Protect / Claim Early
Which townsfolk should out themselves? Which should stay hidden?
What claims create pressure on evil?

## Evil Bluff Recommendations
Which roles should Minions bluff? Which are safest for the Demon?
What claims are overdone and suspicious?

## Key Threats to Identify
Which role(s) does good need to find or kill to win?
Which roles are most dangerous if evil holds them?

## Mid-game Pivots
When should good shift strategy? What signals indicate the game state has changed?

## Common Mistakes
One or two mistakes beginners make on this script (good and evil side).

Keep advice concrete and script-specific. Do not give generic BOTC tips.`
    },
  },

  {
    id: 'explain-chars',
    icon: 'menu_book',
    label: 'Explain characters',
    labelZh: '解释角色',
    desc: 'Explain each character\'s role and interactions in this specific script context.',
    descZh: '解释每个角色在该剧本中的具体作用和交互。',
    forContexts: ['script'],
    chip: false,
    prompt: (ctx) => {
      const title = strField(ctx, 'title', 'this script')
      return `Explain each character in the BOTC script "${title}". Return only a \`message\`.

For each character, one short paragraph:
- What the ability does mechanically
- How it interacts with other characters IN THIS SCRIPT (not in general)
- What role it plays in the good/evil information economy
- What evil might bluff as this character

Group by team (Townsfolk, Outsiders, Minions, Demon). Use the character list from context.
Do not explain characters not in this script. Do not invent abilities.`
    },
  },

  {
    id: 'suggest-improvements',
    icon: 'tune',
    label: 'Suggest improvements',
    labelZh: '建议改进',
    desc: 'Concrete swap suggestions to improve script balance, fun, or flow.',
    descZh: '具体的换牌建议，改善剧本平衡性、趣味性或游戏流程。',
    forContexts: ['script'],
    chip: false,
    prompt: (ctx) => {
      const title = strField(ctx, 'title', 'this script')
      return `Suggest concrete improvements to the BOTC script "${title}". Return only a \`message\`.

For each suggestion:
- State what to REMOVE and what to ADD (or swap)
- Explain WHY: what problem does this fix? (balance, bluff space, redundancy, etc.)
- Note any new interactions the change creates

Check for:
1. **Role redundancy** — Multiple characters doing similar things?
2. **Bluff drought** — Evil has too few safe bluffs?
3. **Hard confirmation** — Good can lock too many roles down?
4. **Missing outsider synergy** — Outsiders create confusion but are ignored?
5. **Stale meta** — Is this a common script archetype that experienced players solve easily?

Limit to 3–5 actionable suggestions. Be specific. No vague "consider adding more information roles."`
    },
  },

  {
    id: 'script-difficulty',
    icon: 'signal_cellular_alt',
    label: 'Script difficulty',
    labelZh: '剧本难度评估',
    desc: 'Rate difficulty for players and storyteller; beginner friendliness assessment.',
    descZh: '评估玩家和说书人的难度；新手友好度评估。',
    forContexts: ['script'],
    chip: false,
    prompt: (ctx) => {
      const title = strField(ctx, 'title', 'this script')
      return `Rate the difficulty of the BOTC script "${title}". Return only a \`message\`.

## Player Difficulty
Rate 1–5 (1 = beginner, 5 = expert). What makes this hard or easy for players?
List the top 2 mechanics that require rules knowledge.

## Storyteller Difficulty
Rate 1–5. What rulings are most complex? How much per-night bookkeeping is required?
Which character abilities are most error-prone to run?

## Beginner Friendliness
Is this suitable as someone's first game? First 5 games?
Which roles might confuse new players without explanation?

## Recommended Player Count
Optimal player range for this script and why.

## Teaching Notes
If running for new players, what 2–3 rules interactions need pre-game explanation?

Base ratings ONLY on characters in this script. Provide concrete reasoning, not just a number.`
    },
  },

  // ── Storyteller skills ──────────────────────────────────────────────────────

  {
    id: 'st-advice',
    icon: 'support_agent',
    label: 'ST advice',
    labelZh: '说书人建议',
    desc: 'Actionable storyteller advice for the current game phase and state.',
    descZh: '针对当前游戏阶段和状态的可操作说书人建议。',
    forContexts: ['storyteller'],
    chip: true,
    prompt: (ctx) => {
      const day   = strField(ctx, 'currentDay', '?')
      const phase = strField(ctx, 'phase', '?')
      const alive = strField(ctx, 'alive')
      const dead  = strField(ctx, 'dead')

      return `Give storyteller advice for the current game state. Return only a \`message\`.

Day ${day}, Phase: ${phase}${alive ? `\nAlive: ${alive}` : ''}${dead ? `\nDead: ${dead}` : ''}

Advice structure:

## Immediate Priority
What is the single most important thing the ST should handle right now?

## Tonight's Night Order
Which roles will the ST need to wake tonight? Any order-of-operations risks?

## Information to Deliver
What information should be given out tonight, and how should it be framed to stay fair?

## Fairness Check
Is there any situation where good or evil has an unfair advantage the ST should correct?

## Upcoming Pivots
What decision point is approaching in the next 1–2 days that the ST should prepare for?

Stay fair to both sides. Do not favor a team. Flag any rules interactions that need resolution.
Base advice ONLY on game state provided. Do not assume hidden roles.`
    },
  },

  {
    id: 'predict-outcome',
    icon: 'analytics',
    label: 'Predict outcome',
    labelZh: '预测结果',
    desc: 'Predict good/evil advantage and likely win condition from current state.',
    descZh: '根据当前状态预测好人/邪恶优势和可能的胜利条件。',
    forContexts: ['storyteller'],
    chip: true,
    prompt: (ctx) => {
      const day  = strField(ctx, 'currentDay', '?')
      const alive = strField(ctx, 'alive')
      const dead  = strField(ctx, 'dead')
      const votes = strField(ctx, 'recentVotes')

      return `Predict the likely game outcome. Return only a \`message\`.

Day ${day}${alive ? `\nAlive: ${alive}` : ''}${dead ? `\nDead: ${dead}` : ''}${votes ? `\nRecent votes: ${votes}` : ''}

## Current Advantage
Which side has the advantage right now — good or evil? Why?

## Most Likely Win Path (Good)
What sequence of events leads to a good team win from here?

## Most Likely Win Path (Evil)
What sequence of events leads to an evil team win from here?

## Critical Unknown
What single piece of information would most change this prediction?

## Confidence
How certain is this prediction? (low / medium / high) What makes it uncertain?

Acknowledge uncertainty explicitly. Do not invent hidden information or assume unknown roles.`
    },
  },

  {
    id: 'who-to-watch',
    icon: 'visibility',
    label: 'Who to watch',
    labelZh: '关注玩家',
    desc: 'Identify key players requiring storyteller attention, with specific reasons.',
    descZh: '找出需要说书人重点关注的玩家，并说明具体原因。',
    forContexts: ['storyteller'],
    chip: false,
    prompt: (ctx) => {
      const alive  = strField(ctx, 'alive')
      const votes  = strField(ctx, 'recentVotes')

      return `Identify key players the storyteller should watch. Return only a \`message\`.
${alive ? `\nAlive players: ${alive}` : ''}${votes ? `\nRecent votes: ${votes}` : ''}

For each player flagged, state:
- Why they need attention (ability interaction, suspicious behavior, likely role conflict)
- What the ST should verify or track
- Any timing window where their ability might misfire or be forgotten

Also flag:
- Any upcoming night actions the ST might accidentally skip
- Any ability interactions on the board that require careful ordering

Base this ONLY on information in the game log. Do not speculate about hidden roles.`
    },
  },

  // ── Game log skills ─────────────────────────────────────────────────────────

  {
    id: 'game-summary',
    icon: 'summarize',
    label: 'Game summary',
    labelZh: '游戏总结',
    desc: 'Concise narrative summary of the full game.',
    descZh: '整局游戏的简洁叙事总结。',
    forContexts: ['gamelog'],
    chip: true,
    prompt: () =>
      `Summarize this Blood on the Clocktower game. Return only a \`message\`.

Write a concise narrative (4–7 sentences) covering:
- Script name and approximate player count
- Which team won and how (execution, Demon kill, final-3, etc.)
- Most important deaths and when they occurred
- Key vote results that changed the game
- The decisive moment that determined the outcome

Be specific. Use player names from the log. Do not use generic filler.`,
  },

  {
    id: 'debrief',
    icon: 'after_today',
    label: '复盘 Debrief',
    labelZh: '复盘分析',
    desc: 'Full post-game debrief: info flow, vote analysis, pivots, and counterfactuals.',
    descZh: '完整复盘分析：信息流、投票分析、关键转折和反事实推演。',
    forContexts: ['gamelog'],
    chip: true,
    prompt: () =>
      `Perform a thorough 复盘 (post-game debrief) analysis. Return only a \`message\`.

## Information Flow
Who provided information, who was believed, and who was deceived?
At what point did false information cause incorrect decisions?

## Key Vote Analysis
For each significant vote: was the nomination correct in hindsight?
What information did each side have at that moment?
Could the outcome have been predicted?

## Pivotal Moments
List 2–3 turning points that most determined the final outcome.
For each: what happened, and why it mattered.

## Good Team Assessment
What did good do well? What was their critical error?

## Evil Team Assessment
What did evil do well? How did their deception succeed or fail?

## Counterfactuals
One realistic alternative play for each side that could have changed the outcome.

Be specific. Reference player names and exact events from the log.
Acknowledge if information is insufficient for a conclusion — do not guess.`,
  },

  {
    id: 'timeline',
    icon: 'timeline',
    label: 'Timeline',
    labelZh: '时间线',
    desc: 'Chronological event timeline grouped by day.',
    descZh: '按天分组的关键事件时间线。',
    forContexts: ['gamelog'],
    chip: false,
    prompt: () =>
      `Create a chronological event timeline. Return only a \`message\`.

Format as bullet list grouped by day:

**Day 1:**
- [Night] ...
- [Day] ...
- [Vote] Nominator → Target: X/Y votes — passed/failed

Include ONLY significant events:
- Night deaths (name, role if known)
- Executions (name, role, vote count)
- Key ability uses and their stated results
- Role reveals (voluntary or forced)
- Game-state-changing information exchanges

Omit trivial phase transitions. Use player names from the log.`,
  },

  {
    id: 'player-stats',
    icon: 'bar_chart',
    label: 'Player stats',
    labelZh: '玩家统计',
    desc: 'Per-player statistics: role, nominations, votes, survival, key actions.',
    descZh: '每位玩家统计：角色、提名、投票、存活、关键行动。',
    forContexts: ['gamelog'],
    chip: false,
    prompt: () =>
      `Generate per-player statistics from the game log. Return only a \`message\`.

For each player provide:
| Player | Role (if known) | Survived? | Times Nominated | Nominations Made | Notable Actions |

Also include a summary row showing totals.

"Notable Actions" = any ability use, role reveal, or decisive vote.
If a player's role was never confirmed, write "unknown".
Sort by seat number or nomination count (most nominated first).`,
  },

  // ── Analysis skills ─────────────────────────────────────────────────────────

  {
    id: 'game-insights',
    icon: 'insights',
    label: 'Game insights',
    labelZh: '游戏洞察',
    desc: 'Patterns and trends from your game history and statistics.',
    descZh: '从游戏历史和统计数据中提取模式和趋势。',
    forContexts: ['analysis'],
    chip: true,
    prompt: (ctx) => {
      const count   = strField(ctx, 'recordCount', '0')
      const scripts = strField(ctx, 'recentScripts')
      return `Analyze this Blood on the Clocktower game history. Return only a \`message\`.

Total games recorded: ${count}${scripts ? `\nRecent scripts: ${scripts}` : ''}

## Win Rate Patterns
Which scripts or configurations favor good/evil? Any outliers?

## Script Popularity
Which scripts are played most? Any underplayed or overplayed?

## Recurring Outcomes
Any recurring game patterns? (e.g., Demon survives to final 3 often, executions frequently wrong)

## Suggested Focus
Based on patterns, what should players study or change to improve?

Keep analysis grounded in the data provided. Note if sample size is too small for reliable conclusions.`
    },
  },

  // ── General ─────────────────────────────────────────────────────────────────

  {
    id: 'rules-q',
    icon: 'help',
    label: 'Rules question',
    labelZh: '规则问题',
    desc: 'Ask a rules question about Blood on the Clocktower.',
    descZh: '提问关于血染钟楼的规则问题。',
    forContexts: ['character', 'script', 'storyteller', 'gamelog', 'analysis', 'general'],
    chip: false,
    prompt: () =>
      `I have a rules question about Blood on the Clocktower.

Rules: If the answer is known from official published rules or widely accepted rulings, state the ruling clearly.
If uncertain, say so explicitly and recommend checking the official BotC Discord or wiki.
Do NOT invent rulings. Do NOT speculate about unofficial interactions.
Do NOT reference characters not provided in context.`,
  },
]

// ── Accessors ─────────────────────────────────────────────────────────────────

export function getChipSkills(ctx: AiContext): SkillDef[] {
  return SKILLS.filter((s) => s.chip && s.forContexts.includes(ctx.type))
}

export function getSkillsFor(ctx: AiContext): SkillDef[] {
  return SKILLS.filter((s) => s.forContexts.includes(ctx.type))
}
