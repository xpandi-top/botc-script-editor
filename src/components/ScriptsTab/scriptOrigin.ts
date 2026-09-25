import { communityScriptSource } from '../../core/script/format'
import type { EditableScript } from '../../types'

/** Author and publication, without repeating a publisher who is also the author. */
export function authorAndOrigin(author: string, origin: string) {
  return [origin && author && origin.startsWith(author) ? '' : author, origin].filter(Boolean).join(' · ')
}

/** "钟楼剧本博物馆 第100期" for an imported community script, else ''. */
export function scriptOrigin(script: EditableScript, tpl: (key: 'source_issue_n', ...args: (string | number)[]) => string) {
  const source = communityScriptSource(script.meta)
  if (!source) return ''
  return source.issue ? `${source.name} ${tpl('source_issue_n', source.issue)}` : source.name
}
