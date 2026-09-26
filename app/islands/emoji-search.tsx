import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { FormEvent } from 'react'
import {
  DEFAULT_API_ORIGIN,
  normalizeQuery,
  runEngine,
} from '@lib/emoji-search/engines'
import type { EngineId, Outcome, Tile } from '@lib/emoji-search/engines'
import {
  getLocalSearch,
  isLocalModelCached,
  LOCAL_DOWNLOAD_MB,
} from '@lib/emoji-search/local'
import type { LocalStatus } from '@lib/emoji-search/local'

/**
 * The MDX `<EmojiSearch>`: one search box, three engines side by side, all
 * running from the reader's browser.
 *
 * Rendered twice from this file: React renders it at build time inside the
 * `<Island name="emoji-search">` fallback, and preact/compat renders it again
 * when the island nears the viewport. Nothing in the first render may read the
 * browser -- the local model's status, `matchMedia`, the network -- or the
 * hydrated markup would disagree with the fallback. All of that arrives in
 * effects, one render later.
 *
 * Class names are literals from app/mdx/components/emoji-search.css. That
 * sheet is plain, not layered, and so is markdown.css, whose `article ul` and
 * `article img` rules beat any Tailwind utility on the same property: lists
 * and images here are reset in the sheet.
 */

export interface EmojiSearchProps {
  /** The slack-emoji-search deployment serving /api/search and /api/jev. */
  apiOrigin?: string
}

interface EngineMeta {
  id: EngineId
  name: string
  sub: string
}

const ENGINES: readonly EngineMeta[] = [
  {
    id: 'local',
    name: 'On your device',
    sub: 'bge-small, in your browser',
  },
  {
    id: 'api',
    name: 'Embeddings API',
    sub: 'text-embedding-3-large + Postgres (pgvector)',
  },
  {
    id: 'jev',
    name: 'Jev',
    sub: 'via Vercel AI Gateway',
  },
]

/** Tiles rendered per column: the sheet shows 2 rows of 7 on a phone, 3 of 6
 * wider up. */
const TILE_LIMIT = 18
/** The time bars never scale to less than this, so 40 ms is not "full". */
const BAR_FLOOR_MS = 500

/* ------------------------------------------------------------- panels -- */

/**
 * One engine's column. Every request carries a sequence number, and an answer
 * is shown only if nothing newer is already on screen, so responses arriving
 * out of order never step backwards and the previous results stay up until
 * the next ones land.
 */
interface Panel {
  shown: Outcome | null
  shownSeq: number
  latestSeq: number
  pending: boolean
  error: string | null
}

type Panels = Record<EngineId, Panel>

type PanelAction =
  | { type: 'request'; engine: EngineId; seq: number }
  | { type: 'resolve'; engine: EngineId; seq: number; outcome: Outcome }
  /** A local search a newer one replaced before it ran. */
  | { type: 'settle'; engine: EngineId; seq: number }
  | { type: 'reject'; engine: EngineId; seq: number; message: string }
  | { type: 'reset'; engine: EngineId; seq: number }

const EMPTY_PANEL: Panel = {
  shown: null,
  shownSeq: 0,
  latestSeq: 0,
  pending: false,
  error: null,
}

const INITIAL_PANELS: Panels = {
  local: EMPTY_PANEL,
  api: EMPTY_PANEL,
  jev: EMPTY_PANEL,
}

function panelReducer(panels: Panels, action: PanelAction): Panels {
  const panel = panels[action.engine]
  const latest = action.seq === panel.latestSeq
  let next: Panel
  switch (action.type) {
    case 'request':
      next = { ...panel, latestSeq: action.seq, pending: true }
      break
    case 'resolve':
      if (action.seq < panel.shownSeq) return panels
      next = {
        shown: action.outcome,
        shownSeq: action.seq,
        latestSeq: panel.latestSeq,
        pending: latest ? false : panel.pending,
        error: null,
      }
      break
    case 'settle':
      if (!latest) return panels
      next = { ...panel, pending: false }
      break
    case 'reject':
      if (!latest) return panels
      next = {
        shown: null,
        shownSeq: action.seq,
        latestSeq: panel.latestSeq,
        pending: false,
        error: action.message,
      }
      break
    case 'reset':
      next = { ...EMPTY_PANEL, shownSeq: action.seq, latestSeq: action.seq }
      break
  }
  return { ...panels, [action.engine]: next }
}

interface Totals {
  queries: number
  cost: number
}

const INITIAL_TOTALS: Record<EngineId, Totals> = {
  local: { queries: 0, cost: 0 },
  api: { queries: 0, cost: 0 },
  jev: { queries: 0, cost: 0 },
}

/* --------------------------------------------------------- formatting -- */

function formatMs(ms: number): string {
  if (ms < 10) return `${ms.toFixed(1)} ms`
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`
}

/** Two significant figures for fractions of a cent, whole dollars from $100. */
function formatUsd(usd: number): string {
  if (!(usd > 0)) return '$0'
  if (usd >= 100) return `$${Math.round(usd).toLocaleString('en-US')}`
  if (usd >= 0.01) return `$${usd.toFixed(2)}`
  const digits = Math.min(20, 1 - Math.floor(Math.log10(usd)))
  return `$${usd.toFixed(digits).replace(/0+$/, '')}`
}

const plural = (count: number, one: string, many: string) =>
  `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

/** How the compute time splits. */
function breakdown(outcome: Outcome): string {
  if (outcome.engine === 'local') {
    return `${formatMs(outcome.embedMs)} in the model, ${formatMs(outcome.searchMs)} searching`
  }
  if (outcome.engine === 'jev') {
    return plural(outcome.tokens, 'input token', 'input tokens')
  }
  return `${formatMs(outcome.embedMs)} embedding, ${formatMs(outcome.dbMs)} in Postgres`
}

/**
 * The network, under the compute time rather than in it: how far the reader
 * is from the server is not the engine's doing, but it is still time waited.
 * A repeat query is answered from a cache, so its round trip is all network.
 */
function networkLine(outcome: Outcome): string {
  if (outcome.engine === 'local') return 'no network'
  const network = outcome.cached
    ? outcome.roundTripMs
    : Math.max(0, outcome.roundTripMs - outcome.computeMs)
  return `+ ${formatMs(network)} network`
}

/* ------------------------------------------------------- local model -- */

/** Feature detection: the model runs in a Worker on WebAssembly. */
function missingForLocal(): string | null {
  if (typeof WebAssembly !== 'object') {
    return "This browser can't run the model: it has no WebAssembly."
  }
  if (typeof Worker !== 'function') {
    return "This browser can't run the model: it has no Web Workers."
  }
  return null
}

const IDLE: LocalStatus = { state: 'idle' }
const subscribeLocal = (onChange: () => void) =>
  getLocalSearch().subscribe(onChange)
const localSnapshot = () => getLocalSearch().getStatus()
const serverSnapshot = () => IDLE

/* ------------------------------------------------------------- island -- */

export default function EmojiSearch({
  apiOrigin = DEFAULT_API_ORIGIN,
}: EmojiSearchProps) {
  const [input, setInput] = useState('')
  const query = normalizeQuery(input)
  const [panels, dispatch] = useReducer(panelReducer, INITIAL_PANELS)
  const [totals, setTotals] = useState(INITIAL_TOTALS)
  const localStatus = useSyncExternalStore(
    subscribeLocal,
    localSnapshot,
    serverSnapshot,
  )
  /** A failure local.ts cannot report through its status. */
  const [localProblem, setLocalProblem] = useState<string | null>(null)

  const mounted = useRef(false)
  const seq = useRef(0)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  /**
   * Anything typed into the server-rendered input before hydration. A ref
   * callback runs at commit, before any effect, and preact leaves an input's
   * value alone while hydrating, so the first render still matches the
   * fallback and the next one adopts what is already in the box.
   */
  const attachInput = useCallback((node: HTMLInputElement | null) => {
    const typed = node?.value ?? ''
    if (typed) setInput((current) => (current === typed ? current : typed))
  }, [])

  const addToTotals = useCallback((engine: EngineId, cost: number) => {
    if (!mounted.current) return
    setTotals((current) => ({
      ...current,
      [engine]: {
        queries: current[engine].queries + 1,
        cost: current[engine].cost + cost,
      },
    }))
  }, [])

  /** Runs one engine for one query; `fresh` runs cost money and count. */
  const launch = useCallback(
    (engine: EngineId, text: string, at: number) => {
      const { promise, fresh } = runEngine(engine, text, apiOrigin)
      promise.then(
        (outcome) => {
          if (outcome && fresh) addToTotals(engine, outcome.cost)
          if (!mounted.current) return
          dispatch(
            outcome
              ? { type: 'resolve', engine, seq: at, outcome }
              : { type: 'settle', engine, seq: at },
          )
        },
        (error: unknown) => {
          if (!mounted.current) return
          dispatch({
            type: 'reject',
            engine,
            seq: at,
            message: messageOf(error),
          })
        },
      )
    },
    [apiOrigin, addToTotals],
  )

  const localPhase = localProblem ? 'error' : localStatus.state

  // Both servers: every keystroke, no debounce. A query someone has already
  // typed is answered from the server's cache, so short prefixes cost nothing
  // after the first reader.
  useEffect(() => {
    for (const engine of ['api', 'jev'] as const) {
      const at = ++seq.current
      if (!query) {
        dispatch({ type: 'reset', engine, seq: at })
        continue
      }
      dispatch({ type: 'request', engine, seq: at })
      launch(engine, query, at)
    }
  }, [query, launch])

  // On the device: every keystroke, once the model is loading or loaded. A
  // search asked for while it loads waits in local.ts, newest query only.
  useEffect(() => {
    const at = ++seq.current
    if (!query || (localPhase !== 'loading' && localPhase !== 'ready')) {
      dispatch({ type: 'reset', engine: 'local', seq: at })
      return
    }
    dispatch({ type: 'request', engine: 'local', seq: at })
    launch('local', query, at)
  }, [query, localPhase, launch])

  /**
   * Loads the model. Errors land in the status. Called from the button that
   * says it downloads the model, or when it's already in the browser's cache.
   */
  const startLocal = useCallback(async () => {
    const missing = missingForLocal()
    if (missing) {
      setLocalProblem(missing)
      return
    }
    setLocalProblem(null)
    const local = getLocalSearch()
    try {
      await local.load()
    } catch (error) {
      // local.ts reports its own load failures through the status. This is
      // for the ones it cannot, like a Worker that failed to construct.
      if (mounted.current && local.getStatus().state !== 'error') {
        setLocalProblem(messageOf(error))
      }
    }
  }, [])

  // Downloaded on an earlier visit: loading is free now, so just start it.
  // Everyone else gets the button: the download is opt-in.
  useEffect(() => {
    let live = true
    void isLocalModelCached().then((cached) => {
      if (live && cached && getLocalSearch().getStatus().state === 'idle') {
        void startLocal()
      }
    })
    return () => {
      live = false
    }
  }, [startLocal])

  /* ------------------------------------------------------------ render -- */

  const views = ENGINES.map((engine) => {
    const panel = panels[engine.id]
    const outcome = panel.shown
    return {
      engine,
      panel,
      totals: totals[engine.id],
      ms: outcome ? outcome.computeMs : null,
      // The device is free whether or not it has run yet.
      cost: engine.id === 'local' ? 0 : outcome ? outcome.cost : null,
      breakdown: outcome ? breakdown(outcome) : null,
      network: outcome ? networkLine(outcome) : null,
    }
  })
  const scale = Math.max(BAR_FLOOR_MS, ...views.map((view) => view.ms ?? 0))
  // Always there, so the line appearing doesn't shift the layout.
  const modelLine =
    localStatus.state === 'ready'
      ? `model loaded in ${(localStatus.loadMs / 1000).toFixed(1)} s`
      : 'model not loaded yet'

  return (
    <div className="es-root">
      <div className="es-search">
        <input
          ref={attachInput}
          className="es-input"
          type="search"
          value={input}
          placeholder="Search 4,668 emoji"
          aria-label="Search emoji"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          onInput={(event: FormEvent<HTMLInputElement>) =>
            setInput(event.currentTarget.value)
          }
        />
      </div>

      {/* One card per engine: its numbers, then its results. */}
      <div className="es-engines">
        {views.map((view) => (
          <Fragment key={view.engine.id}>
            <div
              className={view.panel.pending ? 'es-cell es-busy' : 'es-cell'}
              data-engine={view.engine.id}
            >
              <div className="es-title">
                <span className="es-dot" aria-hidden="true" />
                <span className="es-name">{view.engine.name}</span>
              </div>
              <div className="es-sub">{view.engine.sub}</div>
              <div className="es-ms">
                <span className="sr-only">compute time </span>
                {view.ms === null ? '—' : formatMs(view.ms)}
              </div>
              {/* Always rendered, so numbers arriving never move anything. */}
              <div className="es-net">{view.network ?? '\u00a0'}</div>
              <div className="es-track" aria-hidden="true">
                {view.ms === null ? null : (
                  <div
                    className="es-fill"
                    style={{
                      width: `${Math.max(2, (view.ms / scale) * 100).toFixed(1)}%`,
                    }}
                  />
                )}
              </div>
              <div className="es-cost">
                <span className="sr-only">cost </span>
                {view.cost === null ? '—' : formatUsd(view.cost)}
                <span className="es-cost-label"> this search</span>
              </div>
              <div className="es-per">
                {`${view.cost === null ? '—' : formatUsd(view.cost * 1e6)} per 1M searches`}
              </div>
              <EngineNotes
                breakdown={view.breakdown}
                modelLine={view.engine.id === 'local' ? modelLine : null}
                totals={view.totals}
              />
            </div>
            <div className="es-col" data-engine={view.engine.id}>
              {view.engine.id === 'local' && localPhase !== 'ready' ? (
                <LocalGate
                  status={localStatus}
                  problem={localProblem}
                  onStart={() => void startLocal()}
                />
              ) : (
                <Results
                  name={view.engine.name}
                  panel={view.panel}
                  stale={view.panel.shown?.query !== query}
                />
              )}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- pieces -- */

function EngineNotes({
  breakdown: text,
  modelLine,
  totals,
}: {
  breakdown: string | null
  modelLine: string | null
  totals: Totals
}) {
  return (
    <div className="es-notes">
      {text ? <div className="text-[var(--fg)]">{text}</div> : null}
      {modelLine ? <div>{modelLine}</div> : null}
      <div>
        {`${plural(totals.queries, 'search', 'searches')} so far, ${formatUsd(totals.cost)} total`}
      </div>
    </div>
  )
}

function LocalGate({
  status,
  problem,
  onStart,
}: {
  status: LocalStatus
  problem: string | null
  onStart: () => void
}) {
  const error = problem ?? (status.state === 'error' ? status.message : null)
  if (error !== null) {
    return (
      <div className="es-body flex flex-col items-start gap-3">
        <div className="text-sm leading-relaxed text-[var(--fg)]">
          {`The model didn't load: ${error}`}
        </div>
        <button type="button" className="es-button" onClick={onStart}>
          Retry
        </button>
      </div>
    )
  }

  if (status.state === 'loading') {
    // The index files report only once they finish, and before the model
    // reports at all, so the running total alone would start near 100%.
    const total = Math.max(status.total, LOCAL_DOWNLOAD_MB * 1e6)
    const percent = Math.min(100, (status.loaded / total) * 100)
    const warming = status.total > 0 && status.loaded >= status.total
    return (
      <div className="es-body flex flex-col justify-center gap-2">
        <div
          className="es-track"
          role="progressbar"
          aria-label="Downloading the model"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
        >
          <div
            className="es-fill"
            style={{ width: `${percent.toFixed(1)}%` }}
          />
        </div>
        <div className="text-xs text-[var(--gray)]">
          {warming
            ? 'Warming up the model…'
            : `Loading the model: ${(status.loaded / 1e6).toFixed(1)} of ${Math.round(total / 1e6)} MB`}
        </div>
      </div>
    )
  }

  return (
    <div className="es-body flex flex-col items-start justify-center gap-3">
      <div className="text-xs leading-relaxed text-[var(--gray)]">
        bge-small-en-v1.5 downloads once, then every search runs on-device.
      </div>
      <button type="button" className="es-button" onClick={onStart}>
        {`Run on this device (~${LOCAL_DOWNLOAD_MB} MB, cached after)`}
      </button>
    </div>
  )
}

/** Memoized: a keystroke re-renders the island once per engine answer. */
const Results = memo(
  ({
    name,
    panel,
    stale,
  }: {
    name: string
    panel: Panel
    /** Still showing an older query's answer while the new one runs. */
    stale: boolean
  }) => {
    if (panel.error !== null) {
      return (
        <div className="es-body flex items-center text-sm leading-relaxed text-[var(--fg)]">
          {panel.error}
        </div>
      )
    }
    const shown = panel.shown
    if (!shown) {
      return (
        <div className="es-body flex items-center text-xs leading-relaxed text-[var(--gray)]">
          {panel.pending ? 'Searching…' : 'Type to search.'}
        </div>
      )
    }
    if (shown.tiles.length === 0) {
      return (
        <div className="es-body flex items-center text-xs text-[var(--gray)]">
          {`Nothing for “${shown.query}”.`}
        </div>
      )
    }
    return (
      <ul
        className={stale ? 'es-body es-grid es-stale' : 'es-body es-grid'}
        aria-label={`${name} results for ${shown.query}`}
        aria-busy={panel.pending}
      >
        {shown.tiles.slice(0, TILE_LIMIT).map((tile) => (
          <TileView
            key={`${tile.name}\n${tile.char ?? tile.src}`}
            tile={tile}
          />
        ))}
      </ul>
    )
  },
)

const TileView = memo(({ tile }: { tile: Tile }) => {
  const [broken, setBroken] = useState(false)
  let glyph
  if (tile.char) {
    glyph = (
      <span className="es-glyph" role="img" aria-label={tile.name}>
        {tile.char}
      </span>
    )
  } else if (tile.src && !broken) {
    glyph = (
      <img
        className="es-img"
        src={tile.src}
        alt={tile.name}
        width={28}
        height={28}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
    )
  } else {
    // An image that did not load still says which emoji won.
    glyph = (
      <span className="es-missing" role="img" aria-label={tile.name}>
        {`:${tile.name}:`}
      </span>
    )
  }
  return (
    <li className="es-tile" title={tile.name}>
      {glyph}
    </li>
  )
})
