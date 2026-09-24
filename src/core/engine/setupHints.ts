/**
 * Checks for laying out a game (排板): what setup abilities in [brackets]
 * change, which players are shown a character other than their own, who
 * must sit where, and mistakes in the Demon's bluffs — as reminders while
 * the Storyteller deals, before anything goes wrong at the table.
 *
 * Framework-free: the catalog is injected (team, name, ability text).
 */
import type { Team } from '../types/catalog'
import type { TeamLookup } from './alignment'
import { CHARACTER_DISTRIBUTION, SETUP_OUTSIDER_SHIFTS } from './setup'

type Lang = 'zh' | 'en'
type CoreTeam = 'townsfolk' | 'outsider' | 'minion' | 'demon'
const CORE_TEAMS: CoreTeam[] = ['townsfolk', 'outsider', 'minion', 'demon']

type SetupRule = {
  /** The layout is up to the Storyteller's choices (Legion, Kazali, …): counts are not checked. */
  free?: boolean
  /** The player is shown a character of this kind, not their own, and does not know it. */
  shownAs?: 'townsfolk' | 'outsider' | 'demon' | 'good'
  /** Counted as this type when laying out. */
  countsAs?: CoreTeam
  /** Sits next to the Demon. */
  neighborsDemon?: boolean
  /** Other characters that come with this one. */
  requires?: string[]
  /** Several players may have this character. */
  repeats?: boolean
  /** What to remember while dealing. */
  note?: { zh: string; en: string }
}

export const SETUP_RULES: Record<string, SetupRule> = {
  drunk: { shownAs: 'townsfolk', note: { zh: '给这名玩家一个不在场的镇民标记，他以为自己是该镇民；计数时仍算外来者。', en: 'Give this player a not-in-play Townsfolk token; they think they are it. They still count as an Outsider.' } },
  lunatic: { shownAs: 'demon', note: { zh: '给这名玩家一个恶魔标记，他以为自己是恶魔；计数时算外来者。首夜恶魔会得知疯子是谁。', en: 'Give this player a Demon token; they think they are the Demon. They count as an Outsider; the Demon learns who the Lunatic is.' } },
  marionette: { shownAs: 'good', neighborsDemon: true, note: { zh: '必须与恶魔邻座；给他一个善良角色标记，他以为自己是善良角色；计数时算爪牙。恶魔会得知提线木偶是谁。', en: 'Must neighbor the Demon. Give them a good character token; they think they are good. They count as a Minion; the Demon knows who they are.' } },
  wudaozhe: { shownAs: 'outsider', note: { zh: '给这名玩家一个外来者标记，他以为自己是外来者；计数时算镇民。', en: 'Give this player an Outsider token; they think they are an Outsider. They count as a Townsfolk.' } },
  scarecrow: { shownAs: 'townsfolk', note: { zh: '给这名玩家一个镇民标记，他以为自己是镇民；计数时算外来者。', en: 'Give this player a Townsfolk token; they think they are it. They count as an Outsider.' } },
  doll: { shownAs: 'good', neighborsDemon: true, note: { zh: '必须与恶魔邻座；给他一个善良角色标记，他以为自己是善良角色；计数时算爪牙。', en: 'Must neighbor the Demon. Give them a good character token; they think they are good. They count as a Minion.' } },
  twinflower: { shownAs: 'townsfolk', free: true, repeats: true, note: { zh: '额外加一名双生花，两名双生花邻座；给他们镇民标记，他们以为自己是镇民。', en: 'Add a second Twinflower; the two sit next to each other and are shown Townsfolk tokens.' } },
  titan: { countsAs: 'minion', note: { zh: '配置时泰坦占一个爪牙名额。', en: 'The Titan takes a Minion slot when laying out.' } },
  magician: { note: { zh: '首夜给恶魔和爪牙信息时，恶魔以为魔术师是爪牙，爪牙以为魔术师是恶魔。', en: 'In the first-night Minion and Demon info, the Demon sees the Magician as a Minion and the Minions see them as the Demon.' } },
  huntsman: { free: true, requires: ['damsel'], note: { zh: '落难少女必须在场。', en: 'The Damsel must be in play.' } },
  choirboy: { requires: ['king'], note: { zh: '国王必须在场。', en: 'The King must be in play.' } },
  village_idiot: { free: true, repeats: true, note: { zh: '可额外加 0–2 名村夫；多名村夫时其中一名醉酒。', en: 'Add 0–2 extra Village Idiots; if there are several, one of them is drunk.' } },
  bountyhunter: { note: { zh: '有一名镇民是邪恶阵营：给他标记阵营。', en: 'One Townsfolk is evil: mark their alignment.' } },
  lord_of_typhon: { free: true, note: { zh: '邪恶角色要坐成一排，堤丰之首在正中。', en: 'Evil players sit in a line with the Lord of Typhon in the middle.' } },
  legion: { free: true, repeats: true },
  kazali: { free: true },
  xaan: { free: true },
  atheist: { free: true },
  summoner: { free: true },
  lilmonsta: { free: true },
  kappa: { free: true },
  corruptus: { free: true },
  the_sea_born: { free: true },
  venomtail: { free: true },
  ettin: { free: true, repeats: true },
  wolfboy: { free: true },
}

/** Outsider changes of the Fabled (not players, so not in SETUP_OUTSIDER_SHIFTS). */
const FABLED_OUTSIDER_SHIFTS: Record<string, number[]> = { sentinel: [-1, 0, 1] }

/** The [bracketed] setup part of an ability text, if any. */
export function setupBracket(ability: string | undefined): string | null {
  return ability?.match(/[[［][^\]］]+[\]］]/)?.[0] ?? null
}

export type TeamRange = Record<CoreTeam, [number, number]>

export type SetupExpectation = {
  /** Counts by player number, before setup abilities. */
  base: Record<CoreTeam, number>
  /** Allowed range per type after the setup abilities in play. */
  expected: TeamRange
  /** Characters whose setup changes counts: id and the Outsider changes it allows. */
  shifts: Array<{ id: string; options: number[] }>
  /** Characters whose layout is the Storyteller's choice; counts are not checked when any is present. */
  free: string[]
}

/** What the counts should be for `players` with these characters (and Fabled) in play. */
export function setupExpectation(players: number, inPlay: string[], fabled: string[] = []): SetupExpectation | null {
  const base = CHARACTER_DISTRIBUTION[players]
  if (!base) return null
  const shifts = [
    ...[...new Set(inPlay)].filter((id) => SETUP_OUTSIDER_SHIFTS[id]).map((id) => ({ id, options: SETUP_OUTSIDER_SHIFTS[id] })),
    ...fabled.filter((id) => FABLED_OUTSIDER_SHIFTS[id]).map((id) => ({ id, options: FABLED_OUTSIDER_SHIFTS[id] })),
  ]
  const low = shifts.reduce((sum, s) => sum + Math.min(...s.options), 0)
  const high = shifts.reduce((sum, s) => sum + Math.max(...s.options), 0)
  const outsider: [number, number] = [Math.max(0, base.outsider + low), base.outsider + high]
  const expected: TeamRange = {
    townsfolk: [base.townsfolk - high, base.townsfolk - low],
    outsider,
    minion: [base.minion, base.minion],
    demon: [base.demon, base.demon],
  }
  return { base: { ...base }, expected, shifts, free: [...new Set(inPlay)].filter((id) => SETUP_RULES[id]?.free) }
}

/** Counts of the dealt characters by type, as setup counts them (the Titan takes a Minion slot). */
export function dealtCounts(inPlay: string[], getTeam: TeamLookup): Record<CoreTeam, number> {
  const counts: Record<CoreTeam, number> = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
  for (const id of inPlay) {
    const team = (SETUP_RULES[id]?.countsAs ?? getTeam(id)) as Team | undefined
    if (team && team in counts) counts[team as CoreTeam]++
  }
  return counts
}

export type SetupHint = { level: 'warn' | 'info'; id?: string; seat?: number; text: string }

export type SetupCheckInput = {
  /** Players who are not Travellers; their seats are 1…players. */
  players: number
  /** Seat → real character. */
  seats: Record<number, string | null | undefined>
  /** Seat numbers of Travellers (they sit in the ring too). */
  travellerSeats?: number[]
  /** Seat → the character the player is shown, when it differs. */
  perceived?: Record<number, string | null | undefined>
  bluffs?: string[]
  fabled?: string[]
  getTeam: TeamLookup
  name: (id: string) => string
  /** Ability text in `language`, for the [bracket] part. */
  ability?: (id: string) => string | undefined
  language: Lang
}

const TEAM_NAMES: Record<Lang, Record<CoreTeam, string>> = {
  zh: { townsfolk: '镇民', outsider: '外来者', minion: '爪牙', demon: '恶魔' },
  en: { townsfolk: 'Townsfolk', outsider: 'Outsiders', minion: 'Minions', demon: 'Demons' },
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`)
const range = ([a, b]: [number, number]) => (a === b ? `${a}` : `${a}–${b}`)

/**
 * Reminders and mistakes for the current deal: warnings first (wrong
 * counts, a Drunk with nothing to believe, a Marionette not next to the
 * Demon, a bluff that is in play, …), then what each setup character asks
 * of the Storyteller.
 */
export function setupHints(input: SetupCheckInput): SetupHint[] {
  const zh = input.language === 'zh'
  const { getTeam, name } = input
  const warn: SetupHint[] = []
  const info: SetupHint[] = []
  const seatIds = Object.entries(input.seats)
    .map(([seat, id]) => [Number(seat), id] as const)
    .filter((entry): entry is readonly [number, string] => Boolean(entry[1]) && entry[0] <= input.players)
  const inPlay = seatIds.map(([, id]) => id)
  const fabled = input.fabled ?? []

  // Counts.
  const expectation = setupExpectation(input.players, inPlay, fabled)
  if (expectation) {
    for (const shift of expectation.shifts) {
      const bracket = setupBracket(input.ability?.(shift.id)) ?? ''
      const change = shift.options.length === 1
        ? (zh ? `外来者 ${signed(shift.options[0])}，镇民 ${signed(-shift.options[0])}` : `${signed(shift.options[0])} Outsiders, ${signed(-shift.options[0])} Townsfolk`)
        : (zh ? `外来者 ${shift.options.map(signed).join(' 或 ')}（说书人决定），镇民相应增减` : `${shift.options.map(signed).join(' or ')} Outsiders (your choice), Townsfolk the other way`)
      const label = bracket ? `${name(shift.id)} ${bracket}` : name(shift.id)
      info.push({ level: 'info', id: shift.id, text: `${label}${zh ? '：' : ': '}${change}` })
    }
    const full = inPlay.length === input.players
    if (full && !expectation.free.length) {
      const dealt = dealtCounts(inPlay, getTeam)
      const wrong = CORE_TEAMS.filter((team) => dealt[team] < expectation.expected[team][0] || dealt[team] > expectation.expected[team][1])
      if (wrong.length) {
        const why = expectation.shifts.length ? (zh ? `（已计入 ${expectation.shifts.map((s) => name(s.id)).join('、')}）` : ` (counting ${expectation.shifts.map((s) => name(s.id)).join(', ')})`) : ''
        warn.push({
          level: 'warn',
          text: zh
            ? `人数配置不对${why}：${wrong.map((team) => `${TEAM_NAMES.zh[team]}应为 ${range(expectation.expected[team])}，现为 ${dealt[team]}`).join('；')}。`
            : `Counts are off${why}: ${wrong.map((team) => `${TEAM_NAMES.en[team]} should be ${range(expectation.expected[team])}, are ${dealt[team]}`).join('; ')}.`,
        })
      }
    }
    for (const id of expectation.free) {
      const bracket = setupBracket(input.ability?.(id))
      if (bracket && !SETUP_RULES[id]?.note) {
        info.push({ level: 'info', id, text: zh ? `${name(id)} ${bracket}：按方括号调整配置，人数不自动核对。` : `${name(id)} ${bracket}: adjust the setup as the brackets say; counts are not checked.` })
      }
    }
  }

  // Characters that repeat, and characters that come with others.
  const seen = new Map<string, number>()
  for (const [, id] of seatIds) seen.set(id, (seen.get(id) ?? 0) + 1)
  for (const [id, count] of seen) {
    if (count > 1 && !SETUP_RULES[id]?.repeats) warn.push({ level: 'warn', id, text: zh ? `${name(id)} 被发给了 ${count} 名玩家。` : `${name(id)} is dealt to ${count} players.` })
  }
  for (const id of new Set(inPlay)) {
    for (const required of SETUP_RULES[id]?.requires ?? []) {
      if (!seen.has(required)) warn.push({ level: 'warn', id, text: zh ? `${name(id)} 在场，但 ${name(required)} 不在场。` : `${name(id)} is in play but the ${name(required)} is not.` })
    }
  }

  // Players shown another character, and seating.
  const all = [...new Set([...Array.from({ length: input.players }, (_, i) => i + 1), ...(input.travellerSeats ?? [])])].sort((a, b) => a - b)
  const neighbors = (seat: number) => {
    const i = all.indexOf(seat)
    return [all[(i - 1 + all.length) % all.length], all[(i + 1) % all.length]]
  }
  const demonSeats = seatIds.filter(([, id]) => getTeam(id) === 'demon').map(([seat]) => seat)
  for (const [seat, id] of seatIds) {
    const rule = SETUP_RULES[id]
    if (!rule) continue
    const who = zh ? `${seat} 号${name(id)}` : `Seat ${seat} (${name(id)})`
    if (rule.note) info.push({ level: 'info', id, seat, text: `${who}${zh ? '：' : ': '}${rule.note[input.language]}` })
    if (rule.shownAs) {
      const shown = input.perceived?.[seat]
      const shownTeam = shown ? getTeam(shown) : undefined
      const ok = shown && shown !== id && (rule.shownAs === 'good' ? shownTeam === 'townsfolk' || shownTeam === 'outsider' : shownTeam === rule.shownAs)
      if (!ok) {
        const kind = rule.shownAs === 'good' ? (zh ? '善良角色' : 'good character') : TEAM_NAMES[input.language][rule.shownAs].replace(/s$/, '')
        warn.push({ level: 'warn', id, seat, text: zh ? `${who} 还没有设置“以为的角色”（应为一个${kind}）。` : `${who} has no character to believe they are (should be a ${kind}).` })
      } else if (rule.shownAs !== 'demon' && inPlay.includes(shown)) {
        warn.push({ level: 'warn', id, seat, text: zh ? `${who} 以为的角色 ${name(shown)} 已在场，应选不在场的角色。` : `${who} believes they are the ${name(shown)}, who is in play; pick a not-in-play character.` })
      }
    }
    if (rule.neighborsDemon && demonSeats.length && !neighbors(seat).some((s) => demonSeats.includes(s))) {
      warn.push({ level: 'warn', id, seat, text: zh ? `${who} 没有与恶魔邻座。` : `${who} does not neighbor the Demon.` })
    }
  }

  // The Demon's bluffs: three good characters that are not in play.
  const bluffs = (input.bluffs ?? []).filter(Boolean)
  for (const id of bluffs) {
    const team = getTeam(id)
    if (inPlay.includes(id)) warn.push({ level: 'warn', id, text: zh ? `恶魔伪装 ${name(id)} 已在场。` : `The Demon bluff ${name(id)} is in play.` })
    else if (team !== 'townsfolk' && team !== 'outsider') warn.push({ level: 'warn', id, text: zh ? `恶魔伪装 ${name(id)} 不是善良角色。` : `The Demon bluff ${name(id)} is not a good character.` })
  }
  if (input.players >= 7 && inPlay.length === input.players && bluffs.length < 3 && demonSeats.length) {
    info.push({ level: 'info', text: zh ? `还差 ${3 - bluffs.length} 个恶魔伪装（7 人及以上首夜要给恶魔 3 个不在场的善良角色）。` : `${3 - bluffs.length} Demon bluff(s) to choose (7+ players: 3 not-in-play good characters on the first night).` })
  }

  return [...warn, ...info]
}

/**
 * What to show the players who are dealt a character they do not know they
 * have (Drunk, Lunatic, Marionette, …): a not-in-play character of the kind
 * they believe in, from the script — the in-play Demon for a Lunatic.
 * Seat → character; seats without such a character are left out.
 */
export function suggestShownCharacters(
  seats: Record<number, string | null | undefined>,
  scriptCharacters: string[],
  getTeam: TeamLookup,
  rng: () => number = Math.random,
): Record<number, string> {
  const dealt = Object.values(seats).filter((id): id is string => Boolean(id))
  const taken = new Set(dealt)
  const out: Record<number, string> = {}
  const pick = (team: CoreTeam) => {
    const candidates = scriptCharacters.filter((id) => !taken.has(id) && getTeam(id) === team)
    const choice = candidates[Math.floor(rng() * candidates.length)]
    if (choice) taken.add(choice)
    return choice
  }
  for (const [seat, id] of Object.entries(seats)) {
    const shownAs = id ? SETUP_RULES[id]?.shownAs : undefined
    if (!shownAs) continue
    const choice = shownAs === 'demon'
      ? dealt.find((other) => getTeam(other) === 'demon') ?? pick('demon')
      : pick(shownAs === 'good' ? 'townsfolk' : shownAs)
    if (choice) out[Number(seat)] = choice
  }
  return out
}
