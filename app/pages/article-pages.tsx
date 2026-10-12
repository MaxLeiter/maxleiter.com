import type { CSSProperties, ReactNode } from 'react'
import { transitionName } from '@framework/shared/transitions'
import { TIERS, filmTime, pad2, type Film, type Mission } from '@lib/meridian'
import {
  PanelHead,
  ScreenHead,
  type MeridianCounts,
} from '@components/meridian/chrome'
import { DifficultyShields, Plate } from '@components/meridian/art'
import { PageShell } from './shell'

/**
 * Post and note pages: a mission briefing and a film in the theater.
 *
 * MDX is compiled once at build and the resulting element is passed in as
 * `content`; markdown.css styles it as before, inside the reader panel. The
 * `<article>` carries the view-transition name, so a mission row on `/blog`
 * (or a film on `/notes`) morphs into the panel it opens.
 */

function Thanks() {
  return (
    <footer className="mx-art-foot">
      <p>
        Thanks for reading! If you want to see future content, you can follow me{' '}
        <a
          href="https://twitter.com/maxleiter"
          target="_blank"
          rel="noopener noreferrer"
        >
          on X
        </a>{' '}
        or subscribe to my <a href="/feed.xml">RSS feed</a>.
      </p>
    </footer>
  )
}

export interface PostPageProps {
  mission: Mission
  /** The missions either side, oldest-first numbering. */
  previous?: Mission
  next?: Mission
  content: ReactNode
  counts: MeridianCounts
  toolbar?: boolean
}

export function BlogPostPage({
  mission,
  previous,
  next,
  content,
  counts,
  toolbar = true,
}: PostPageProps) {
  const tier = TIERS[mission.tier]
  return (
    <PageShell
      toolbar={toolbar}
      crumbs={[
        { label: 'Main menu', href: '/' },
        { label: 'Campaign', href: '/blog' },
        { label: `Mission ${pad2(mission.num)}` },
      ]}
      back={{ href: '/blog', label: 'Mission select' }}
      counts={counts}
    >
      <ScreenHead
        as="p"
        title="Briefing"
        sub={`Mission ${pad2(mission.num)} · Intel package decrypted`}
      />
      <div className="mx-briefing">
        <article
          className="mx-panel mx-article"
          style={
            {
              viewTransitionName: transitionName('blog', mission.slug),
            } as CSSProperties
          }
        >
          <PanelHead as="p" aside={mission.date}>
            Transmission
          </PanelHead>
          <div className="mx-reader">
            <header className="mx-art-head">
              <h1 className="mx-art-title">{mission.title}</h1>
              <p className="mx-art-meta">
                <time dateTime={mission.dateISO}>{mission.date}</time> ·{' '}
                <i>{tier}</i> · {mission.minutes} min read
              </p>
              {mission.description && (
                <p className="mx-art-desc">{mission.description}</p>
              )}
            </header>
            <div className="mx-prose">{content}</div>
            <Thanks />
          </div>
        </article>
        <div
          className="mx-panel mx-dossier"
          role="group"
          aria-label="Mission summary"
        >
          <div className="mx-shot">
            <Plate seed={mission.slug} kind="land" className="mx-shot-art" />
            <div className="mx-shot-tl" aria-hidden="true">
              <span>Sector {pad2(mission.num)}</span>
              <span>{mission.year}</span>
            </div>
            <div className="mx-shot-cap">
              <small>Mission {pad2(mission.num)}</small>
            </div>
          </div>
          <div className="mx-dossier-body">
            <div>
              <span className="mx-lab">Difficulty</span>
              <DifficultyShields tier={mission.tier} />
              <p className="mx-kv">
                {tier}
                <small>
                  Est. {mission.minutes} min read
                  {mission.codeLines > 0
                    ? ` · ${mission.codeLines} lines of code`
                    : ''}
                </small>
              </p>
            </div>
            <div>
              <span className="mx-lab">Deployed</span>
              <p className="mx-kv">
                {mission.date}
                <small>
                  {mission.gapDays === null
                    ? 'First deployment'
                    : `${mission.gapDays} days after mission ${pad2(mission.num - 1)}`}
                </small>
              </p>
            </div>
            {(previous || next) && (
              <nav className="mx-adjacent" aria-label="Adjacent missions">
                {previous && (
                  <a className="mx-adj" href={`/blog/${previous.slug}`}>
                    <span className="mx-lab">
                      ‹ Mission {pad2(previous.num)}
                    </span>
                    <span className="mx-adj-t">{previous.title}</span>
                  </a>
                )}
                {next && (
                  <a className="mx-adj mx-adj-next" href={`/blog/${next.slug}`}>
                    <span className="mx-lab">Mission {pad2(next.num)} ›</span>
                    <span className="mx-adj-t">{next.title}</span>
                  </a>
                )}
              </nav>
            )}
            <a className="mx-cta mx-ghost" href="/blog">
              ‹ Mission select
            </a>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

export interface NotePageProps {
  film: Film
  content: ReactNode
  counts: MeridianCounts
  toolbar?: boolean
}

export function NotePage({
  film,
  content,
  counts,
  toolbar = true,
}: NotePageProps) {
  const length = filmTime(film.secs)
  return (
    <PageShell
      toolbar={toolbar}
      crumbs={[
        { label: 'Main menu', href: '/' },
        { label: 'Theater', href: '/notes' },
        { label: film.title },
      ]}
      back={{ href: '/notes', label: 'Saved films' }}
      counts={counts}
    >
      <ScreenHead as="p" title="Theater" sub={`Now playing · ${film.date}`} />
      <article
        className="mx-panel mx-article mx-film"
        style={
          {
            viewTransitionName: transitionName('note', film.slug),
          } as CSSProperties
        }
      >
        <div className="mx-film-frame" aria-hidden="true">
          <Plate seed={film.slug} kind="film" className="mx-shot-art" />
          <div className="mx-film-hud">
            <span className="mx-rec">
              <i />
              Playback
            </span>
            <span className="mx-tc">00:00 / {length}</span>
            <span className="mx-cam">Camera: free · {film.title}</span>
          </div>
        </div>
        <div className="mx-timeline" aria-hidden="true">
          <span className="mx-tl-btn">
            <svg viewBox="0 0 14 14">
              <path d="M3 1.5v11L12 7z" />
            </svg>
          </span>
          <span className="mx-track">
            <span className="mx-rail" />
            {film.ticks.map((tick) => (
              <span
                key={tick}
                className="mx-tick"
                style={{ left: `${(tick * 100).toFixed(1)}%` }}
              />
            ))}
            <span className="mx-fill" />
            <span className="mx-head-mark" />
          </span>
          <span className="mx-tread">{length}</span>
        </div>
        <div className="mx-reader">
          <header className="mx-art-head">
            <h1 className="mx-art-title">{film.title}</h1>
            <p className="mx-art-meta">
              <time dateTime={film.dateISO}>{film.date}</time> ·{' '}
              <i>{film.type}</i> · {length} running time
            </p>
            {film.description && (
              <p className="mx-art-desc">{film.description}</p>
            )}
          </header>
          <div className="mx-prose">{content}</div>
          <Thanks />
        </div>
      </article>
    </PageShell>
  )
}
