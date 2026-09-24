/**
 * Character wiki page (MediaWiki source) → guide sections, for
 * scripts/build-guides.mjs. Pure, so src/__tests__/guideParse.test.ts can run
 * it on fixtures. Section ids are those of src/core/ai/guides.ts.
 *
 * Both wikis use the same page layout (the Chinese wiki translates the
 * English one), so one parser serves both: level-2 headings pick the
 * section, bullets / examples / blank-line paragraphs become paragraphs
 * separated by a blank line, and links, templates and HTML become text.
 */

/** Level-2 headings → section ids. Unlisted headings (角色信息, Summary's infobox) are dropped. */
const HEADINGS = [
  [/^角色能力$/, 'ability'],
  [/^背景故事$/, 'flavor'],
  [/^角色(简介|详解)$/, 'summary'],
  [/^范例$/, 'examples'],
  [/^运作方式$/, 'howto'],
  [/^提示标记$/, 'reminder_details'],
  [/^规则细节$/, 'rules'],
  [/^提示与技巧/, 'tips'],
  [/^伪装成/, 'bluffing'],
  [/^对抗/, 'fighting'],
  [/^Summary$/i, 'summary'],
  [/^How to Run$/i, 'howto'],
  [/^Examples?$/i, 'examples'],
  [/^Tips (&|and) Tricks/i, 'tips'],
  [/^Bluffing as/i, 'bluffing'],
  [/^Fighting/i, 'fighting'],
  [/^Rules? (Details|Clarifications?)$/i, 'rules'],
]

export function sectionIdFor(heading) {
  return HEADINGS.find(([pattern]) => pattern.test(heading.trim()))?.[1] ?? null
}

/** Inline markup → text: links, templates, bold / italic, HTML. */
export function cleanInline(text) {
  let out = text
    .replace(/\[\[(?:File|Image|文件|Category|分类):[^\]]*\]\]/gi, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1')
    .replace(/\[https?:\/\/[^\]\s]+\]/g, '')
  // {{Good|Exorcist}} / {{Evil|Shabaloth}} → the last argument; nested templates first.
  for (let i = 0; i < 4 && /\{\{/.test(out); i++) {
    out = out.replace(/\{\{([^{}]*)\}\}/g, (_m, inner) => {
      const parts = inner.split('|')
      return parts.length > 1 ? parts[parts.length - 1] : ''
    })
  }
  return out
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/'{2,}/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/__[A-Z]+__/g, '')
    .replace(/[ \t\u200b]+/g, ' ')
    .trim()
}

const CJK = /[\u3000-\u9fff\uff00-\uffef]/

/** Join wrapped lines of one paragraph: no space between CJK characters. */
function joinLines(lines) {
  return lines.reduce((acc, line) => {
    if (!acc) return line
    return CJK.test(acc.at(-1)) || CJK.test(line[0]) ? acc + line : `${acc} ${line}`
  }, '')
}

/**
 * One section's source → paragraphs. Bullets and example blocks start a
 * paragraph; plain lines continue one until a blank line. Level-3 headings
 * ("=== 作为善良 ===") prefix the next paragraph.
 */
function sectionParagraphs(body, id) {
  // In 提示标记 a bullet names a token and the 放置时机 / 移除时机 lines under it
  // belong to it: one paragraph per token, one line per note.
  const grouped = id === 'reminder_details'
  const paragraphs = []
  let current = []
  let prefix = ''
  const flush = () => {
    const text = grouped ? current.join('\n') : joinLines(current)
    current = []
    if (!text) return
    paragraphs.push(prefix ? `${prefix}：${text}` : text)
    prefix = ''
  }
  // Example blocks on the English wiki are <div class='example'> … </div>.
  const lines = body
    .replace(/<div[^>]*class=['"]example['"][^>]*>([\s\S]*?)<\/div>/gi, (_m, inner) => `\n\n${inner.replace(/\s*\n\s*/g, ' ').trim()}\n\n`)
    .split('\n')
  for (const raw of lines) {
    if (/^\s*(\{\||\|\}|\|-)/.test(raw)) continue // table scaffolding
    const heading = raw.match(/^\s*={3,}\s*(.*?)\s*={3,}\s*$/)
    if (heading) { flush(); prefix = cleanInline(heading[1]); continue }
    const bullet = raw.match(/^\s*[*#]+\s*(.*)$/)
    const text = cleanInline(bullet ? bullet[1] : raw.replace(/^\s*[|!]\s*/, ''))
    if (bullet) flush()
    if (!text) { if (!grouped) flush(); continue }
    current.push(text)
    if (bullet && !grouped) flush()
  }
  flush()
  return paragraphs.filter((p) => !/^[：:]?$/.test(p))
}

/** Ability tags from the Chinese wiki's 角色信息 (“角色能力类型：[[免死]]、[[醉酒]]”). */
export function abilityTags(wikitext) {
  const line = wikitext.match(/角色能力类型[：:]\s*(.+)/)?.[1]
  if (!line) return []
  return [...new Set(cleanInline(line).split(/[、，,\s]+/).map((s) => s.trim()).filter((s) => s && s !== '无'))]
}

/**
 * The guide entry for one page: { summary, examples, howto, … } as
 * paragraphs joined by a blank line, `ability` — the ability text the page
 * describes (its 角色能力 section; on the English wiki the quoted first line
 * of the Summary), so readers can tell when the guide was written for
 * another version — and `tags` when the page lists them.
 */
export function parseGuidePage(wikitext) {
  const entry = {}
  const parts = wikitext.split(/^\s*==(?!=)\s*(.+?)\s*==\s*$/m)
  for (let i = 1; i < parts.length; i += 2) {
    const heading = cleanInline(parts[i])
    const id = sectionIdFor(heading)
    if (!id) continue
    let paragraphs = sectionParagraphs(parts[i + 1] ?? '', id)
    if (id === 'ability') { entry.ability = paragraphs.join(''); continue }
    if (id === 'summary' && /^["“].*["”]$/s.test(paragraphs[0] ?? '')) {
      entry.ability ??= paragraphs[0].slice(1, -1).trim()
      paragraphs = paragraphs.slice(1)
    }
    if (id === 'flavor') paragraphs = paragraphs.map((p) => p.replace(/^["“](.*)["”]$/s, '$1'))
    // A heading that says whom a tips section is for ("提示与技巧（作为邪恶）") prefixes its first paragraph.
    const scope = heading.match(/[（(](.+?)[）)]$/)?.[1]
    if (scope && paragraphs.length) paragraphs[0] = `${scope}：${paragraphs[0]}`
    if (!paragraphs.length) continue
    entry[id] = entry[id] ? `${entry[id]}\n\n${paragraphs.join('\n\n')}` : paragraphs.join('\n\n')
  }
  const tags = abilityTags(wikitext)
  if (tags.length) entry.tags = tags
  return entry
}
