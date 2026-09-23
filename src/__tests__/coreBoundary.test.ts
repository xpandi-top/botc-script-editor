/**
 * src/core must stay framework-free so the future API/MCP worker can bundle it
 * (docs/ARCHITECTURE-API.md, decision D1). This test runs in `npm test` / CI;
 * `npm run core:check` additionally type-checks core without DOM or Vite types.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

const CORE_DIR = resolve(process.cwd(), 'src/core')

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return listSourceFiles(full)
    return /\.tsx?$/.test(name) ? [full] : []
  })
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const IMPORT_PATTERNS = [
  /\bfrom\s+['"]([^'"]+)['"]/g,
  /\bimport\s+['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
]

const FORBIDDEN_GLOBALS: Array<[string, RegExp]> = [
  ['import.meta', /\bimport\.meta\b/],
  ['localStorage', /\blocalStorage\b/],
  ['sessionStorage', /\bsessionStorage\b/],
  ['window', /\bwindow\b/],
  ['document', /\bdocument\b/],
]

const files = listSourceFiles(CORE_DIR)

describe('src/core boundary', () => {
  it('contains source files', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files.map((f) => [relative(CORE_DIR, f), f]))('%s only imports from inside src/core', (_name, file) => {
    const code = stripComments(readFileSync(file, 'utf8'))
    const violations: string[] = []
    for (const pattern of IMPORT_PATTERNS) {
      for (const match of code.matchAll(pattern)) {
        const spec = match[1]
        if (!spec.startsWith('.')) {
          violations.push(`package import "${spec}"`)
          continue
        }
        const target = resolve(dirname(file), spec)
        if (target !== CORE_DIR && !target.startsWith(CORE_DIR + sep)) {
          violations.push(`import outside core "${spec}"`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it.each(files.map((f) => [relative(CORE_DIR, f), f]))('%s uses no browser or bundler globals', (_name, file) => {
    const code = stripComments(readFileSync(file, 'utf8'))
    const used = FORBIDDEN_GLOBALS.filter(([, re]) => re.test(code)).map(([name]) => name)
    expect(used).toEqual([])
  })
})
