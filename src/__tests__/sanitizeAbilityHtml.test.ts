import { describe, expect, it } from 'vitest'
import { sanitizeAbilityHtml } from '../lib/sanitizeAbilityHtml'

describe('sanitizeAbilityHtml', () => {
  it('keeps allowed inline formatting for BOTC ability text', () => {
    const html = 'Each night, <b>choose</b> <i>1</i> player.<br><span>They die.</span>'

    expect(sanitizeAbilityHtml(html)).toBe(html)
  })

  it('removes scripts, unsafe attributes, links, and svg payloads', () => {
    const html = [
      '<img src=x onerror="alert(1)">',
      '<script>alert(2)</script>',
      '<a href="javascript:alert(3)">link</a>',
      '<svg><animate onbegin="alert(4)" /></svg>',
      '<span onclick="alert(5)">safe text</span>',
    ].join('')

    const sanitized = sanitizeAbilityHtml(html)

    expect(sanitized).not.toMatch(/onerror|onclick|script|javascript|svg|animate|href/i)
    expect(sanitized).toContain('link')
    expect(sanitized).toContain('<span>safe text</span>')
  })
})
