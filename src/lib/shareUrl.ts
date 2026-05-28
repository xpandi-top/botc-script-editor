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

// Max compressed payload accepted (prevents zip-bomb DoS via ?ar= URL)
const MAX_COMPRESSED_BYTES = 512_000   // 500 KB
const MAX_DECOMPRESSED_BYTES = 5_000_000 // 5 MB

async function decompress(bytes: Uint8Array): Promise<string> {
  if (bytes.length > MAX_COMPRESSED_BYTES) {
    throw new Error(`Share param too large (${bytes.length} bytes, max ${MAX_COMPRESSED_BYTES})`)
  }
  if (typeof DecompressionStream === 'undefined') {
    return new TextDecoder().decode(bytes)
  }
  const stream = new DecompressionStream('gzip')
  // Start draining readable BEFORE writing — avoids deadlock
  const resultPromise = new Response(stream.readable).text()
  const writer = stream.writable.getWriter()
  await writer.write(bytes as unknown as Uint8Array<ArrayBuffer>)
  await writer.close()
  const text = await resultPromise
  if (text.length > MAX_DECOMPRESSED_BYTES) {
    throw new Error(`Decompressed data too large (${text.length} chars, max ${MAX_DECOMPRESSED_BYTES})`)
  }
  return text
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

/**
 * True when running on localhost / loopback or a non-web native origin
 * (capacitor://, file://) — share links built from these origins won't work
 * for recipients unless VITE_APP_URL is set.
 */
export function isLocalhost(): boolean {
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === ''
}

/** True when running inside a Capacitor or Electron native shell. */
function isNativeOrigin(): boolean {
  const proto = window.location.protocol
  const h = window.location.hostname
  // capacitor:// (Android/iOS), file:// (Electron), app:// (some Electron setups)
  return proto === 'capacitor:' || proto === 'file:' || proto === 'app:' || h === 'localhost'
}

/**
 * Build a full shareable URL pointing at the app with the given param.
 * Priority:
 *   1. VITE_APP_URL env var (set in .env.production and .env.native)
 *   2. window.location.origin if it's a real https/http host
 *   3. Falls back to a relative-path URL (avoids leaking localhost/capacitor)
 */
export function buildShareUrl(paramName: string, encoded: string, hash?: string): string {
  const appUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '')
  const origin = window.location.origin  // can be "null" for file:// origins

  // Resolve base: prefer explicit VITE_APP_URL, then real web origin.
  // If on a native shell with no VITE_APP_URL set, origin is unusable for
  // recipients (localhost / capacitor://localhost / "null") — fall back to
  // relative path only (best-effort; VITE_APP_URL should always be set for
  // native builds via .env.native).
  let base: string
  if (appUrl) {
    // VITE_APP_URL is the complete canonical web base — never append
    // window.location.pathname, which on DMG/Electron is a local filesystem
    // path like /Applications/BOTC Companion.app/…/dist-native/index.html.
    base = appUrl
  } else if (origin && origin !== 'null' && !isNativeOrigin()) {
    base = origin + window.location.pathname
  } else {
    // Last resort: relative URL (won't be shareable externally, but won't produce
    // a visibly wrong "localhost" link either)
    base = window.location.href.split('?')[0]
  }

  const url = new URL(base)
  url.searchParams.set(paramName, encoded)
  return url.toString() + (hash ? '#' + hash : '')
}
