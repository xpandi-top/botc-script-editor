import DOMPurify from 'dompurify'

const ABILITY_HTML_OPTIONS: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'span'],
  ALLOWED_ATTR: [],
}

export function sanitizeAbilityHtml(html: string): string {
  return DOMPurify.sanitize(html, ABILITY_HTML_OPTIONS)
}
