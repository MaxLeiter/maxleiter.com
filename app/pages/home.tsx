import type { CSSProperties } from 'react'
import type { Channel } from '@components/channels/data'
import { Cover } from '@components/cover'
import { TopBar } from '@components/top-bar'
import { Island } from '@framework/render/islands'
import { CommandPalette, roomStyle } from './shell'

/** `.ch-item` widths in channels.css: the first tile of a row is wider. */
const FIRST_TILE = '(max-width: 700px) 82vw, 420px'
const TILE = '(max-width: 700px) 62vw, 250px'

/**
 * The homepage: a channel dashboard.
 *
 * This markup is the whole page with JavaScript off -- six rows of real links,
 * one per channel, scrolling sideways, with a nav that jumps between them. The
 * `channels` island mounts after first paint and, where WebGL2 runs well,
 * draws the same rows as a 3D room over it. It hydrates nothing: it reads the
 * items back out of these links, which stay the accessible source of truth
 * (the scene follows DOM focus), and leaves this layout in place when it
 * cannot run. Its fallback is empty on purpose, like the shot grid's.
 *
 * Every class here is spelled out for the CSS pruner, including the ones the
 * island only toggles: `hidden` buttons ship in the markup for that reason.
 *
 * `html[data-scene='room']` is decided before first paint (SCENE_SCRIPT in
 * the top bar, or left set by the scene's last run in this document) and
 * makes this same markup draw the room's resting frame -- the focused tile
 * and the channel labels where the scene will put them -- so the scene
 * crossfades in over its own layout instead of replacing a different one.
 */

function MotionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12h4l3-7 4 14 3-7h4" />
    </svg>
  )
}

function SoundIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path className="ch-snd-body" d="M11 5 6 9H3v6h3l5 4z" />
      <path
        className="ch-snd-on"
        d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"
      />
      <path className="ch-snd-off" d="m16 9 6 6m0-6-6 6" />
    </svg>
  )
}

export interface HomePageProps {
  channels: Channel[]
}

export function HomePage({ channels }: HomePageProps) {
  return (
    <div className="ui-room ch-root" data-ch-root style={roomStyle('home')}>
      <a className="ui-skip" href="#ch-main">
        Skip to content
      </a>
      <TopBar themeToggle={false}>
        <span className="ch-clock" aria-hidden="true" />
        <button
          type="button"
          className="ui-pill ch-mot"
          aria-pressed="false"
          aria-label="Reduce motion"
          hidden
        >
          <MotionIcon />
          <span className="ui-pill-label">Motion</span>
        </button>
        <button
          type="button"
          className="ui-pill ch-snd"
          aria-pressed="false"
          aria-label="Interface sounds"
          aria-keyshortcuts="M"
          hidden
        >
          <SoundIcon />
          <span className="ui-pill-label">Sound off</span>
        </button>
      </TopBar>

      <nav className="ch-chans" aria-label="Channels">
        <ul>
          {channels.map((channel, index) => (
            <li key={channel.id}>
              <a
                className="ch-chan"
                href={`#ch-${channel.id}`}
                data-ch-chan={index}
                style={{ '--i': index } as CSSProperties}
              >
                {channel.name}
                <small aria-hidden="true">{channel.items.length}</small>
                <span className="ui-sr">, {channel.items.length} items</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <main id="ch-main" className="ch-main" tabIndex={-1}>
        <h1 className="ui-sr">Max Leiter</h1>
        {channels.map((channel, ci) => (
          <section
            key={channel.id}
            className="ch-row"
            id={`ch-${channel.id}`}
            aria-labelledby={`ch-${channel.id}-h`}
            data-hue={channel.hue}
            style={{ '--ui-hue': channel.hue } as CSSProperties}
          >
            <div className="ch-row-head">
              <h2 className="ch-row-h" id={`ch-${channel.id}-h`}>
                {channel.name}
              </h2>
              {channel.more && (
                <a className="ch-more" href={channel.more.href}>
                  {channel.more.label}
                  <span aria-hidden="true">→</span>
                </a>
              )}
            </div>
            <ul className="ch-tiles">
              {channel.items.map((item, i) => (
                <li className="ch-item" key={item.key}>
                  <a
                    className="ch-tile"
                    id={`t-${item.key}`}
                    href={item.href}
                    data-ch={ci}
                    data-i={i}
                    data-seed={item.seed}
                    data-title={item.title}
                    data-date={item.date || undefined}
                    data-desc={item.desc || undefined}
                    data-ext={item.external ? '' : undefined}
                    data-vt-name={item.vtName}
                  >
                    <Cover
                      seed={item.seed}
                      title={item.title}
                      meta={item.meta}
                      chip={item.chip}
                      eager={ci === 0 && i < 3}
                      sizes={i === 0 ? FIRST_TILE : TILE}
                    />
                    <span className="ui-sr">
                      {item.title}
                      {item.date ? `, ${item.date}` : ''}
                      {item.desc ? ` — ${item.desc}` : ''}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      <Island name="channels" on="load">
        {null}
      </Island>
      <CommandPalette />
    </div>
  )
}
