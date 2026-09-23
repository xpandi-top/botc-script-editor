/**
 * Small-vector math for semantic search over the catalog (a few hundred
 * characters): unit vectors, int8 storage and brute-force cosine top-k.
 * At 357 × 1024 dimensions a full scan is well under a millisecond, so no
 * approximate index is needed.
 */

/** Unit-length copy, so cosine similarity is a dot product. */
export function normalize(values: ArrayLike<number>): Float32Array {
  const out = Float32Array.from(values)
  let sum = 0
  for (let i = 0; i < out.length; i++) sum += out[i] * out[i]
  const norm = Math.sqrt(sum)
  if (norm > 0) for (let i = 0; i < out.length; i++) out[i] /= norm
  return out
}

/** int8 quantization (q = round(x / scale), scale = max|x| / 127): a quarter of float32 storage. */
export function quantize(values: ArrayLike<number>): { bytes: Int8Array; scale: number } {
  let max = 0
  for (let i = 0; i < values.length; i++) max = Math.max(max, Math.abs(values[i]))
  const scale = max / 127 || 1
  const bytes = new Int8Array(values.length)
  for (let i = 0; i < values.length; i++) bytes[i] = Math.round(values[i] / scale)
  return { bytes, scale }
}

/** Back to a unit float vector. */
export function dequantize(bytes: Int8Array, scale: number): Float32Array {
  const out = new Float32Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] * scale
  return normalize(out)
}

export type Neighbor = { id: string; score: number }

/** Unit vectors in one contiguous buffer, searched by dot product. */
export class VectorIndex {
  readonly dims: number
  private readonly data: Float32Array
  private readonly position = new Map<string, number>()

  constructor(readonly ids: string[], vectors: Float32Array[]) {
    this.dims = vectors[0]?.length ?? 0
    this.data = new Float32Array(ids.length * this.dims)
    vectors.forEach((v, i) => {
      if (v.length !== this.dims) throw new Error(`Vector ${ids[i]} has ${v.length} dimensions, expected ${this.dims}.`)
      this.data.set(v, i * this.dims)
      this.position.set(ids[i], i)
    })
  }

  get size(): number {
    return this.ids.length
  }

  vectorOf(id: string): Float32Array | undefined {
    const i = this.position.get(id)
    return i === undefined ? undefined : this.data.subarray(i * this.dims, (i + 1) * this.dims)
  }

  /** The k best matches for a unit query vector, best first. */
  nearest(query: ArrayLike<number>, k: number, include: (id: string) => boolean = () => true): Neighbor[] {
    if (query.length !== this.dims) throw new Error(`Query has ${query.length} dimensions, expected ${this.dims}.`)
    const scored: Neighbor[] = []
    for (let i = 0; i < this.ids.length; i++) {
      if (!include(this.ids[i])) continue
      let dot = 0
      const offset = i * this.dims
      for (let d = 0; d < this.dims; d++) dot += this.data[offset + d] * query[d]
      scored.push({ id: this.ids[i], score: dot })
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, k)
  }
}
