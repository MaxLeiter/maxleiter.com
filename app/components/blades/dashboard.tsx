import type { CSSProperties } from 'react'
import { iconHTML, padGlyph, type IconKind } from '@lib/blades/art'
import {
  BUILD_STATE,
  previewHTML,
  profileCardHTML,
  type BladeItem,
  type ProfileCard,
} from '@lib/blades/items'
import { BLADES, HOME_BLADE } from '@lib/blades/theme'
import { BladeRoot, Svg, themeStyle, Topbar } from './chrome'
import type { BladeModel } from './home-model'

/**
 * The homepage at rest: five blades, every row a real link, the first item of
 * each blade previewed, the blog blade open.
 *
 * This is the complete page with JavaScript off. CSS alone places the blades
 * where the spring settles (see `.blade[data-pos]` in blades.css), the blade
 * edges and the phone tabs link to the section pages, and the lists scroll.
 * The `blades` island, a sibling rendered empty, then takes this markup over
 * in place: it adds the listbox and tablist roles, the spring, the guide, the
 * toasts, sound and the gamepad. It never re-renders any of it.
 */

const ENTER =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 3v6H5.4l2.3-2.3-.9-.9L3 9.6l3.8 3.8.9-.9L5.4 10.2H14V3z"/></svg>'
const LEFT_RIGHT =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3 1 8l5 5zM10 3l5 5-5 5z"/></svg>'
const SPEAKER =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10L5 10H2z"/><path class="waves" d="M11 5.2a4 4 0 0 1 0 5.6l-.8-.8a2.9 2.9 0 0 0 0-4zM12.8 3.4a6.5 6.5 0 0 1 0 9.2l-.8-.8a5.4 5.4 0 0 0 0-7.6z"/><path class="mute" d="M11 5.5l.7-.7 1.6 1.6 1.6-1.6.7.7-1.6 1.6 1.6 1.6-.7.7-1.6-1.6-1.6 1.6-.7-.7 1.6-1.6z"/></svg>'

const ICON_FOR: Record<BladeItem['kind'], IconKind> = {
  post: 'post',
  note: 'note',
  project: 'project',
  work: 'work',
  about: 'about',
  page: 'home',
  link: 'link',
  theme: 'theme',
  sound: 'sound',
  motion: 'motion',
  info: 'info',
}

function Row({ item, bi, j }: { item: BladeItem; bi: number; j: number }) {
  const inner = (
    <>
      <Svg className="ico" html={iconHTML(ICON_FOR[item.kind])} />
      <span className="it">{item.title}</span>
      <span className="id">{item.sub}</span>
    </>
  )
  const common = {
    id: `it-${bi}-${j}`,
    'data-j': j,
    className: j === 0 ? 'item is-sel' : 'item',
  }
  if (!item.href) {
    // Settings do something rather than go somewhere. The reading glass is
    // the runtime's theme toggle and works before the island has loaded.
    return (
      <button
        type="button"
        {...common}
        {...(item.kind === 'theme' ? { 'data-theme-toggle': '' } : {})}
      >
        {inner}
      </button>
    )
  }
  return (
    <a
      href={item.href}
      {...common}
      {...(item.vt ? { 'data-vt-name': item.vt } : {})}
      {...(item.external
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
    >
      {inner}
    </a>
  )
}

function Blade({
  model,
  bi,
  card,
}: {
  model: BladeModel
  bi: number
  card: ProfileCard
}) {
  const { theme, items } = model
  const pos = bi < HOME_BLADE ? 'left' : bi === HOME_BLADE ? 'active' : 'right'
  const style = {
    ...themeStyle(theme),
    '--i': bi,
    zIndex: bi + 1,
  } as CSSProperties
  // Only the open blade's preview is in the at-rest frame; the others are
  // out of sight until the island, which draws them, swings one in.
  const first = bi === HOME_BLADE ? items[0] : undefined
  return (
    <section
      className="blade"
      id={`blade-${theme.id}`}
      data-i={bi}
      data-pos={pos}
      aria-labelledby={`bt-${theme.id}`}
      style={style}
    >
      <div className="blade-surface" />
      <div className="blade-shade" />
      <a
        className="blade-tab"
        href={theme.href}
        tabIndex={-1}
        aria-hidden="true"
      >
        <span>{theme.id}</span>
      </a>
      <div className="blade-body">
        <header className="bh">
          <h2 className="bt" id={`bt-${theme.id}`}>
            {theme.id}
          </h2>
          <p className="bs">{theme.sub}</p>
          {theme.href.startsWith('/?') ? (
            <span className="bcount">{model.unit}</span>
          ) : (
            <a className="bcount" href={theme.href}>
              {model.unit}
            </a>
          )}
        </header>
        <div className="cols">
          <div className="left">
            {model.card && (
              <div
                dangerouslySetInnerHTML={{
                  __html: profileCardHTML(card, 'bl'),
                }}
              />
            )}
            <div className="items" aria-label={model.list}>
              {items.map((item, j) => (
                <Row key={j} item={item} bi={bi} j={j} />
              ))}
            </div>
            {model.tip && (
              <div className="tip">
                <span className="orb" aria-hidden="true" />
                <p>
                  <b>{model.tip[0]}</b> {model.tip[1]}
                </p>
              </div>
            )}
            <div className="count">
              <span className="n">1 of {items.length}</span>
              <span className="bar" aria-hidden="true">
                <i style={{ width: `${100 / items.length}%` }} />
              </span>
            </div>
          </div>
          <div
            className="preview"
            {...(first?.vt ? { 'data-vt-name': first.vt } : {})}
          >
            <div
              className="pv-inner"
              dangerouslySetInnerHTML={{
                __html: first
                  ? previewHTML(theme, first, BUILD_STATE, card)
                  : '',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export interface DashboardProps {
  blades: BladeModel[]
  card: ProfileCard
}

export function Dashboard({ blades, card }: DashboardProps) {
  return (
    <BladeRoot blade={BLADES[HOME_BLADE]} className="bl-home" skipTo="stage">
      <canvas id="bg" className="bl-canvas" aria-hidden="true" />
      <Topbar home>
        <span className="clock" id="clock" aria-hidden="true">
          --:--
        </span>
        <button
          className="pill js-only"
          id="sound"
          type="button"
          role="switch"
          aria-checked="false"
          aria-keyshortcuts="M"
          title="Interface sound (M)"
        >
          <Svg html={SPEAKER} />
          <span>Sound</span>
          <span className="state" id="soundLabel" aria-hidden="true">
            off
          </span>
        </button>
      </Topbar>

      <nav className="tabsnav" aria-label="Sections">
        <div className="tabs" id="tabs">
          {blades.map(({ theme }, bi) => (
            <a
              key={theme.id}
              className={bi === HOME_BLADE ? 'tab is-on' : 'tab'}
              id={`tab-${theme.id}`}
              href={theme.href}
              aria-controls={`blade-${theme.id}`}
              style={themeStyle(theme)}
            >
              {theme.id}
            </a>
          ))}
        </div>
      </nav>

      <main className="stage" id="stage" tabIndex={-1}>
        <h1 className="sr-only" id="pageH1">
          Max Leiter
        </h1>
        {blades.map((model, bi) => (
          <Blade key={model.theme.id} model={model} bi={bi} card={card} />
        ))}
      </main>
      <div
        className="sr-only"
        id="live"
        aria-live="polite"
        aria-atomic="true"
      />

      <footer className="hints" aria-label="Controls">
        <div className="hint js-only">
          <Svg className="key kb-only" html={ENTER} />
          <Svg className="key pad-only" html={padGlyph('s')} />
          Select
        </div>
        <div className="hint js-only">
          <span className="key kb-only" aria-hidden="true">
            Esc
          </span>
          <Svg className="key pad-only" html={padGlyph('e')} />
          Back
        </div>
        <div className="hint js-only">
          <Svg className="key kb-only" html={LEFT_RIGHT} />
          <span className="key pad-only" aria-hidden="true">
            LB RB
          </span>
          Blades
        </div>
        <div className="spacer" />
        <div className="hint padchip">
          <i aria-hidden="true" />
          <span id="padName">Controller connected</span>
        </div>
        <div className="hint js-only">
          <span className="key" aria-hidden="true">
            M
          </span>
          Sound
        </div>
        <div className="hint m">Swipe blades · tap to open</div>
        <div className="orb-wrap js-only">
          <button
            className="orb"
            id="orbBtn"
            type="button"
            aria-label="Guide"
            aria-haspopup="dialog"
            aria-expanded="false"
            aria-keyshortcuts="G"
            title="Guide (G)"
          />
          <span className="orb-label" aria-hidden="true">
            guide<span className="kb-hint"> · G</span>
          </span>
        </div>
      </footer>

      <output className="toasts" id="toasts" aria-live="polite" />

      <dialog className="guide" id="guide" aria-label="Guide">
        <div className="guide-backdrop" data-close="" />
        <div className="guide-panel" id="guidePanel">
          <span className="orb big" aria-hidden="true" />
          <div className="guide-title">
            <h2>guide</h2>
            <span id="guideClock" />
          </div>
          <div id="guideCard" />
          <div className="glist" id="glist" />
          <div className="guide-foot">
            <button className="gclose" id="gClose" type="button">
              <span className="key" aria-hidden="true">
                G
              </span>{' '}
              Close guide
            </button>
            <span>Arrows to move · Enter to choose</span>
          </div>
        </div>
      </dialog>
    </BladeRoot>
  )
}
