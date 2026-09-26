import { getLocalSearch } from './local'

/**
 * The three emoji-search engines the `<EmojiSearch>` island compares, behind
 * one promise cache.
 *
 * Both remote endpoints live on the slack-emoji-search deployment, which
 * allows this site's origins and caches per query, so a repeat of someone
 * else's query comes back with the timings and cost of the run that first
 * computed it.
 */

export const DEFAULT_API_ORIGIN = 'https://slack-emoji-search.vercel.app'

export type EngineId = 'local' | 'api' | 'jev'

export interface Tile {
  name: string
  /** The glyph, for Unicode emoji. */
  char: string | null
  /** An absolute image URL, for custom emoji. */
  src: string | null
}

interface Common {
  query: string
  tiles: Tile[]
  /** USD for this one query. */
  cost: number
  /**
   * Time spent searching, network excluded: the model plus the index on the
   * device, or the server's own `timings.totalMs`.
   */
  computeMs: number
  /**
   * What the reader actually waited: the fetch, network included, for the
   * APIs, and the compute time on the device, where there is no network.
   */
  roundTripMs: number
}

export interface LocalOutcome extends Common {
  engine: 'local'
  embedMs: number
  searchMs: number
}

export interface ApiOutcome extends Common {
  engine: 'api'
  embedMs: number
  dbMs: number
  /**
   * Answered from a cache, nothing re-ran: the round trip is real, the server
   * timings and cost are from the run that computed the answer.
   */
  cached: boolean
}

export interface JevOutcome extends Common {
  engine: 'jev'
  tokens: number
  cached: boolean
}

export type Outcome = LocalOutcome | ApiOutcome | JevOutcome

/**
 * The cache key and the query every engine is sent: the servers trim and
 * lowercase anyway, and collapsing it here also lines repeats up for the CDN.
 */
export function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 100)
}

/* ---------------------------------------------------------------- local -- */

async function runLocal(query: string): Promise<LocalOutcome | null> {
  const result = await getLocalSearch().search(query)
  if (!result) return null
  return {
    engine: 'local',
    query,
    tiles: result.hits.map((hit) => ({
      name: hit.name,
      char: hit.char,
      src: hit.url,
    })),
    cost: 0,
    computeMs: result.embedMs + result.searchMs,
    roundTripMs: result.embedMs + result.searchMs,
    embedMs: result.embedMs,
    searchMs: result.searchMs,
  }
}

/* --------------------------------------------------------------- remote -- */

type Json = Record<string, unknown>

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const numberOf = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0

const REMOTE_TIMEOUT_MS = 20_000

interface Fetched {
  body: Json
  timings: Json
  tiles: Tile[]
  roundTripMs: number
  /** `x-vercel-cache` and `x-runtime-cache`, null where not exposed. */
  cdnCache: string | null
  runtimeCache: string | null
}

async function fetchRemote(
  origin: string,
  path: string,
  query: string,
  describeFailure: (status: number) => string,
): Promise<Fetched> {
  const url = `${origin}${path}?q=${encodeURIComponent(query)}`
  const started = performance.now()
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REMOTE_TIMEOUT_MS)
  let response: Response
  let body: unknown
  try {
    response = await fetch(url, { signal: controller.signal })
    body = await response.json().catch(() => null)
  } catch {
    throw new Error(
      timedOut
        ? 'No answer after 20 seconds.'
        : "Couldn't reach the demo server.",
    )
  } finally {
    clearTimeout(timer)
  }
  const roundTripMs = performance.now() - started
  if (!response.ok) throw new Error(describeFailure(response.status))
  if (!isRecord(body) || !Array.isArray(body.results)) {
    throw new Error('The demo server sent something unexpected.')
  }

  const tiles: Tile[] = []
  for (const item of body.results) {
    if (!isRecord(item) || typeof item.name !== 'string') continue
    const url = typeof item.url === 'string' ? item.url : null
    tiles.push({
      name: item.name,
      char: typeof item.char === 'string' ? item.char : null,
      // Custom emoji come back site-relative, `/emoji/party-parrot.webp`.
      src: url ? new URL(url, origin).href : null,
    })
  }

  return {
    body,
    timings: isRecord(body.timings) ? body.timings : {},
    tiles,
    roundTripMs,
    cdnCache: response.headers.get('x-vercel-cache'),
    runtimeCache: response.headers.get('x-runtime-cache'),
  }
}

const HIT = new Set(['HIT', 'STALE'])

/**
 * A hit in the CDN or the function's runtime cache reports the timings and
 * cost of the run that filled it: nothing re-ran.
 */
const wasCached = ({ cdnCache, runtimeCache }: Fetched) =>
  HIT.has(cdnCache ?? '') || HIT.has(runtimeCache ?? '')

async function runApi(origin: string, query: string): Promise<ApiOutcome> {
  const fetched = await fetchRemote(
    origin,
    '/api/search',
    query,
    (status) => `The embeddings API didn't answer (HTTP ${status}).`,
  )
  const serverMs = numberOf(fetched.timings.totalMs)
  return {
    engine: 'api',
    query,
    tiles: fetched.tiles,
    cost: numberOf(fetched.body.cost),
    computeMs: serverMs,
    roundTripMs: fetched.roundTripMs,
    embedMs: numberOf(fetched.timings.embedMs),
    dbMs: numberOf(fetched.timings.dbMs),
    cached: wasCached(fetched),
  }
}

async function runJev(origin: string, query: string): Promise<JevOutcome> {
  const fetched = await fetchRemote(origin, '/api/jev', query, (status) =>
    status === 404
      ? 'Jev is switched off on the demo server right now.'
      : "Jev didn't answer (provider error, or this demo's Jev budget ran out).",
  )
  const serverMs = numberOf(fetched.timings.totalMs)
  return {
    engine: 'jev',
    query,
    tiles: fetched.tiles,
    cost: numberOf(fetched.body.cost),
    computeMs: serverMs,
    roundTripMs: fetched.roundTripMs,
    tokens: numberOf(fetched.body.inputTokens),
    cached: wasCached(fetched),
  }
}

/* ---------------------------------------------------------------- cache -- */

/**
 * One promise per engine and query, so a backspace onto a query already seen
 * is instant and a query in flight is never sent twice. Failures and searches
 * superseded before they ran are evicted, so they can be asked again.
 */
const cache = new Map<string, Promise<Outcome | null>>()
/** Oldest entries go first once a long session has typed this many queries. */
const CACHE_LIMIT = 300

/**
 * Each remote engine runs one request at a time, with one waiting slot that
 * only ever holds the newest query. Nothing queues up behind a slow engine,
 * and whatever is in flight still lands, so Jev shows (faded) progress while
 * you type instead of never finishing. Same idea as the worker in local.ts.
 */
interface Lane {
  busy: boolean
  next?: { run: () => void; drop: () => void }
}
const lanes: Record<'api' | 'jev', Lane> = {
  api: { busy: false },
  jev: { busy: false },
}

function inLane(
  engine: 'api' | 'jev',
  start: () => Promise<Outcome | null>,
): Promise<Outcome | null> {
  const current = lanes[engine]
  return new Promise((resolve, reject) => {
    const run = () => {
      current.busy = true
      start()
        .then(resolve, reject)
        .finally(() => {
          current.busy = false
          const next = current.next
          current.next = undefined
          next?.run()
        })
    }
    if (!current.busy) return run()
    current.next?.drop()
    current.next = { run, drop: () => resolve(null) }
  })
}

const keyOf = (engine: EngineId, query: string, origin: string) =>
  `${engine}\n${origin}\n${query}`

export interface Run {
  /** Null when a newer search replaced this one before it ran. */
  promise: Promise<Outcome | null>
  /** False when this came out of the cache: it cost nothing this time. */
  fresh: boolean
}

export function runEngine(
  engine: EngineId,
  query: string,
  origin: string,
): Run {
  const key = keyOf(engine, query, origin)
  const cached = cache.get(key)
  if (cached) return { promise: cached, fresh: false }

  const started =
    engine === 'local'
      ? runLocal(query)
      : inLane(engine, () =>
          engine === 'api' ? runApi(origin, query) : runJev(origin, query),
        )
  const promise = started.then(
    (outcome) => {
      if (!outcome) cache.delete(key)
      return outcome
    },
    (error: unknown) => {
      cache.delete(key)
      throw error
    },
  )
  cache.set(key, promise)
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!)
  return { promise, fresh: true }
}
