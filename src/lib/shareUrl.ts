/**
 * URL-based data sharing via compressed base64url params.
 * Uses CompressionStream (gzip) when available, falls back to raw base64.
 */

// ── Compress / decompress ─────────────────────────────────────────────────────

async function compress(text: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(text)
  if (typeof CompressionStream === 'undefined') return encoded

  const stream = new CompressionStream('gzip')
  // Start draining readable BEFORE writing — avoids deadlock when buffer fills
  const resultPromise = new Response(stream.readable).arrayBuffer()
  const writer = stream.writable.getWriter()
  await writer.write(encoded)
  await writer.close()
  const buf = await resultPromise
  return new Uint8Array(buf)
}

async function decompress(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === 'undefined') {
    return new TextDecoder().decode(bytes)
  }
  const stream = new DecompressionStream('gzip')
  // Start draining readable BEFORE writing — avoids deadlock
  const resultPromise = new Response(stream.readable).text()
  const writer = stream.writable.getWriter()
  await writer.write(bytes as unknown as Uint8Array<ArrayBuffer>)
  await writer.close()
  return resultPromise
}

// ── Encode / decode ───────────────────────────────────────────────────────────

function toBase64Url(bytes: Uint8Array): string {
  // Process in chunks to avoid call-stack overflow on large arrays
  const CHUNK = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
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

/** Decode a share param back to the original value. Throws on failure. */
export async function decodeShareParam<T>(param: string): Promise<T> {
  const bytes = fromBase64Url(param)
  const json = await decompress(bytes)
  return JSON.parse(json) as T
}

/** Build a full shareable URL pointing at the current app with the given param. */
export function buildShareUrl(paramName: string, encoded: string, hash?: string): string {
  const base = window.location.origin + window.location.pathname
  const url = new URL(base)
  url.searchParams.set(paramName, encoded)
  return url.toString() + (hash ? '#' + hash : '')
}
