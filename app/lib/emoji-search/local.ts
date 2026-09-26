/**
 * Emoji search that runs entirely on the reader's device.
 *
 * bge-small-en-v1.5 (q8 ONNX, ~35 MB, kept in the browser's cache after the
 * first load) embeds the query inside a Web Worker. Ordering matches the
 * server: exact name, then by meaning,
 * where meaning is a 1-bit Hamming shortlist and an int8 rescore against
 * vectors built offline by slack-emoji-search/scripts/export-local-index.ts.
 *
 * The worker is a self-contained function turned into a blob URL, so the island
 * bundle needs no second entry point. It must not close over anything in this
 * module: only its own body survives `toString()`.
 */

export interface LocalHit {
  name: string
  char: string | null
  url: string | null
}

export interface LocalResult {
  hits: LocalHit[]
  /** Time spent running the model on the query. */
  embedMs: number
  /** Everything else: exact-name lookup, shortlist, rescore. */
  searchMs: number
}

export type LocalStatus =
  | { state: 'idle' }
  | { state: 'loading'; loaded: number; total: number }
  | { state: 'ready'; loadMs: number }
  | { state: 'error'; message: string }

export interface LocalSearch {
  /** Downloads the model and index. Safe to call repeatedly. */
  load(): Promise<void>
  /**
   * Resolves `null` when a newer query replaced this one before it ran, so a
   * burst of keystrokes costs one inference, not one per key.
   */
  search(query: string): Promise<LocalResult | null>
  getStatus(): LocalStatus
  subscribe(listener: (status: LocalStatus) => void): () => void
}

export const LOCAL_MODEL = 'Xenova/bge-small-en-v1.5'
/** Approximate first-load download: model, tokenizer and index. */
export const LOCAL_DOWNLOAD_MB = 37

// The self-contained build: transformers.web.min.js imports onnxruntime-web by
// bare specifier, which a browser can't resolve without a bundler.
const TRANSFORMERS_URL =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/dist/transformers.min.js'
const QUERY_PREFIX = 'Represent this sentence for searching relevant passages: '
const INDEX_URL = '/emoji-search/index.json'
const VECTORS_URL = '/emoji-search/vectors.bin'

type ToWorker =
  | {
      type: 'init'
      transformers: string
      model: string
      prefix: string
      index: string
      vectors: string
    }
  | { type: 'search'; query: string }

type FromWorker =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'ready'; loadMs: number }
  | { type: 'error'; message: string }
  /** `result` is null when that one search failed; the model stays loaded. */
  | { type: 'result'; result: LocalResult | null }

/**
 * Whether this browser already has the model from an earlier visit, in the
 * Cache Storage transformers.js fills (`transformers-cache`, keyed by the
 * Hugging Face URL). Then loading it costs no download and can start on its own.
 */
export async function isLocalModelCached(): Promise<boolean> {
  try {
    if (typeof caches === 'undefined') return false
    const cache = await caches.open('transformers-cache')
    const keys = await cache.keys()
    return keys.some(
      (request) =>
        request.url.includes(`/${LOCAL_MODEL}/`) &&
        request.url.endsWith('.onnx'),
    )
  } catch {
    return false
  }
}

let instance: LocalSearch | undefined

export function getLocalSearch(): LocalSearch {
  instance ??= createLocalSearch()
  return instance
}

function createLocalSearch(): LocalSearch {
  let status: LocalStatus = { state: 'idle' }
  const listeners = new Set<(status: LocalStatus) => void>()
  let worker: Worker | undefined
  let ready: Promise<void> | undefined
  let inflight: ((result: LocalResult | null) => void) | undefined
  let queued:
    | { query: string; resolve: (result: LocalResult | null) => void }
    | undefined

  const setStatus = (next: LocalStatus) => {
    status = next
    for (const listener of listeners) listener(next)
  }

  const post = (message: ToWorker) => worker?.postMessage(message)

  const pump = () => {
    if (inflight || !queued || status.state !== 'ready') return
    const job = queued
    queued = undefined
    inflight = (result) => {
      inflight = undefined
      job.resolve(result)
      pump()
    }
    post({ type: 'search', query: job.query })
  }

  const load = () => {
    ready ??= new Promise<void>((resolve, reject) => {
      const source = `(${workerMain.toString()})()`
      const url = URL.createObjectURL(
        new Blob([source], { type: 'text/javascript' }),
      )
      worker = new Worker(url, { type: 'module' })
      worker.onmessage = (event: MessageEvent<FromWorker>) => {
        const message = event.data
        if (message.type === 'progress') {
          setStatus({
            state: 'loading',
            loaded: message.loaded,
            total: message.total,
          })
        } else if (message.type === 'ready') {
          setStatus({ state: 'ready', loadMs: message.loadMs })
          resolve()
          pump()
        } else if (message.type === 'error') {
          // Only loading can fail this way. Drop the worker so load() can retry.
          setStatus({ state: 'error', message: message.message })
          worker?.terminate()
          worker = undefined
          ready = undefined
          queued?.resolve(null)
          queued = undefined
          reject(new Error(message.message))
        } else {
          inflight?.(message.result)
        }
      }
      setStatus({ state: 'loading', loaded: 0, total: 0 })
      post({
        type: 'init',
        transformers: TRANSFORMERS_URL,
        model: LOCAL_MODEL,
        prefix: QUERY_PREFIX,
        index: new URL(INDEX_URL, location.href).href,
        vectors: new URL(VECTORS_URL, location.href).href,
      })
    })
    return ready
  }

  const search = (query: string) =>
    new Promise<LocalResult | null>((resolve) => {
      queued?.resolve(null)
      queued = { query, resolve }
      // A failed load already lands in `status` and resolves the queue with null.
      load().then(pump, () => undefined)
    })

  return {
    load,
    search,
    getStatus: () => status,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/* ------------------------------------------------------------- worker -- */

function workerMain() {
  interface Extractor {
    (
      text: string,
      options: { pooling: 'cls'; normalize: boolean },
    ): Promise<{ data: Float32Array }>
  }
  interface Index {
    dims: number
    imageBase: string
    /** [name, glyph, image URL or site-relative path, normalized name] */
    items: [string, string | null, string | null, string][]
  }
  interface Scope {
    postMessage(message: unknown): void
    onmessage: ((event: MessageEvent) => void) | null
  }

  const scope = self as unknown as Scope
  const SHORTLIST = 300
  const LIMIT = 48

  let extract: Extractor | undefined
  let prefix = ''
  let index: Index | undefined
  let vectors = new Int8Array(0)
  let scales = new Float32Array(0)
  let bits = new Uint32Array(0)
  let words = 0
  /** Normalized name -> item indices, for the exact-name tier. */
  let byName = new Map<string, number[]>()
  // Reused every search: Hamming distance per item, and a histogram of them.
  let hamming = new Uint16Array(0)
  let histogram = new Uint32Array(0)

  const popcount = (x: number) => {
    x -= (x >>> 1) & 0x55555555
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333)
    return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
  }

  async function init(message: Extract<ToWorker, { type: 'init' }>) {
    const t0 = performance.now()
    prefix = message.prefix
    const files = new Map<string, { loaded: number; total: number }>()
    const report = () => {
      let loaded = 0
      let total = 0
      for (const file of files.values()) {
        loaded += file.loaded
        total += file.total
      }
      scope.postMessage({ type: 'progress', loaded, total })
    }

    const fetchTracked = async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`${url}: ${response.status}`)
      const buffer = await response.arrayBuffer()
      files.set(url, { loaded: buffer.byteLength, total: buffer.byteLength })
      report()
      return buffer
    }

    const transformers = (await import(message.transformers)) as {
      pipeline: (
        task: string,
        model: string,
        options: object,
      ) => Promise<Extractor>
    }
    const [extractor, indexBuffer, vectorBuffer] = await Promise.all([
      transformers.pipeline('feature-extraction', message.model, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (event: {
          status: string
          file?: string
          loaded?: number
          total?: number
        }) => {
          if (event.status !== 'progress' || !event.file) return
          files.set(event.file, {
            loaded: event.loaded ?? 0,
            total: event.total ?? 0,
          })
          report()
        },
      }),
      fetchTracked(message.index),
      fetchTracked(message.vectors),
    ])
    extract = extractor
    index = JSON.parse(new TextDecoder().decode(indexBuffer)) as Index

    // vectors.bin: int8 [count x dims], then float32 [count] scales.
    const count = index.items.length
    const dims = index.dims
    vectors = new Int8Array(vectorBuffer, 0, count * dims)
    scales = new Float32Array(vectorBuffer.slice(count * dims))
    words = dims / 32
    bits = new Uint32Array(count * words)
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < dims; j++) {
        if (vectors[i * dims + j]! > 0) {
          bits[i * words + (j >> 5)]! |= 1 << (j & 31)
        }
      }
    }
    byName = new Map()
    index.items.forEach(([, , , name], i) => {
      byName.set(name, [...(byName.get(name) ?? []), i])
    })
    hamming = new Uint16Array(count)
    histogram = new Uint32Array(dims + 1)

    // Warm up: the first inference compiles kernels and is much slower.
    await extractor(`${prefix}warm up`, { pooling: 'cls', normalize: true })
    scope.postMessage({ type: 'ready', loadMs: performance.now() - t0 })
  }

  const similarity = (query: Float32Array, i: number, dims: number) => {
    let dot = 0
    for (let j = 0; j < dims; j++) dot += query[j]! * vectors[i * dims + j]!
    return dot * scales[i]!
  }

  // Hamming distance on sign bits picks a shortlist; int8 dot products rank
  // it. Distances are small integers, so a histogram finds the cutoff for the
  // closest SHORTLIST without sorting every item.
  function closest(query: Float32Array, dims: number, count: number) {
    const queryBits = new Uint32Array(words)
    for (let j = 0; j < dims; j++) {
      if (query[j]! > 0) queryBits[j >> 5]! |= 1 << (j & 31)
    }
    histogram.fill(0)
    for (let i = 0; i < count; i++) {
      let d = 0
      for (let w = 0; w < words; w++) {
        d += popcount(bits[i * words + w]! ^ queryBits[w]!)
      }
      hamming[i] = d
      histogram[d]!++
    }
    let cutoff = 0
    for (let seen = 0; cutoff < dims; cutoff++) {
      seen += histogram[cutoff]!
      if (seen >= SHORTLIST) break
    }
    const shortlist: { i: number; score: number }[] = []
    for (let i = 0; i < count; i++) {
      if (hamming[i]! <= cutoff) {
        shortlist.push({ i, score: similarity(query, i, dims) })
      }
    }
    return shortlist.sort((a, b) => b.score - a.score).map(({ i }) => i)
  }

  async function search(raw: string): Promise<LocalResult> {
    const t0 = performance.now()
    const items = index?.items ?? []
    const dims = index?.dims ?? 0
    const query = raw
      .toLowerCase()
      .replace(/[-_:\s]+/g, ' ')
      .trim()
      .slice(0, 100)
    if (!query || !extract) return { hits: [], embedMs: 0, searchMs: 0 }
    const { data } = await extract(prefix + query, {
      pooling: 'cls',
      normalize: true,
    })
    const embedMs = performance.now() - t0

    // Exact name first, then everything by meaning.
    const exact = byName.get(query) ?? []
    const ranked = [
      ...exact,
      ...closest(data, dims, items.length).filter((i) => !exact.includes(i)),
    ]

    const base = index?.imageBase ?? ''
    const hits = ranked.slice(0, LIMIT).map((i) => {
      const [name, char, image] = items[i]!
      const url = image?.startsWith('/') ? base + image : image
      return { name, char, url }
    })
    return { hits, embedMs, searchMs: performance.now() - t0 - embedMs }
  }

  scope.onmessage = async (event) => {
    const message = event.data as ToWorker
    if (message.type === 'search') {
      const result = await search(message.query).catch(() => null)
      scope.postMessage({ type: 'result', result })
      return
    }
    try {
      await init(message)
    } catch (error) {
      scope.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
