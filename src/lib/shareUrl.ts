/**
 * URL-based data sharing via compressed base64url params.
 * Uses CompressionStream (gzip) when available, falls back to raw base64.
 */

// ── Compress / decompress ─────────────────────────────────────────────────────

async function compress(text: string): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') {
    return new TextEncoder().encode(text)
  }
  const stream = new CompressionStream('gzip')
  const writer = stream.writable.getWriter()
  writer.write(new TextEncoder().encode(text))
  writer.close()
  const chunks: Uint8Array[] = []
  const reader = stream.readable.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length }
  return out
}

async function decompress(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === 'undefined') {
    return new TextDecoder().decode(bytes)
  }
  const stream = new DecompressionStream('gzip')
  const writer = stream.writable.getWriter()
  writer.write(bytes.buffer as ArrayBuffer)
  writer.close()
  const chunks: Uint8Array[] = []
  const reader = stream.readable.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length }
  return new TextDecoder().decode(out)
}

// ── Encode / decode ───────────────────────────────────────────────────────────

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Encode any JSON-serialisable value to a URL-safe base64 string. */
export async function encodeShareParam(data: unknown): Promise<string> {
  const json = JSON.stringify(data)
  const compressed = await compress(json)
  return toBase64Url(compressed)
}

/** Decode a share param back to the original value. */
export async function decodeShareParam<T>(param: string): Promise<T> {
  const bytes = fromBase64Url(param)
  const json = await decompress(bytes)
  return JSON.parse(json) as T
}

/** Build a full shareable URL pointing at the current app with the given param. */
export function buildShareUrl(paramName: string, encoded: string, hash?: string): string {
  const base = window.location.origin + window.location.pathname
  return `${base}?${paramName}=${encoded}${hash ? '#' + hash : ''}`
}
