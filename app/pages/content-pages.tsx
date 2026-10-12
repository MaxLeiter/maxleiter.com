import type { ReactNode } from 'react'
import { POPULAR_SLUGS } from '@lib/types'
import {
  CATEGORY_NAMES,
  TIERS,
  filmTime,
  hashStr,
  pad2,
  type Campaign,
  type ForgeCategory,
  type ForgeObject,
  type Mission,
} from '@lib/meridian'
import { LABS, TALKS } from '@data/extras'
import { transitionName } from '@framework/shared/transitions'
import {
  PanelHead,
  ScreenHead,
  SelBar,
  type MeridianCounts,
} from '@components/meridian/chrome'
import {
  Emblem,
  MedalIcon,
  ObjectIcon,
  Plate,
  RankIcon,
  TierPips,
  Wireframe,
} from '@components/meridian/art'
import { PageShell } from './shell'

/**
 * The section routes, each a MERIDIAN screen: `/blog` is the Campaign,
 * `/notes` the Theater, `/projects` the Forge, `/about` the Service Record,
 * `/labs` Custom Games and `/talks` Broadcasts. The homepage's Matchmaking
 * entry lands on `/blog#matchmaking`, because the blog index is the route
 * that already listed the external posts.
 *
 * Every page takes `toolbar` so the build can emit an `/embed` variant with
 * no chrome.
 */

export interface ContentPageProps {
  campaign: Campaign
  counts: MeridianCounts
  toolbar?: boolean
}

const MAIN_MENU = { label: 'Main menu', href: '/' }
const BACK_TO_MENU = { href: '/', label: 'Main menu' }

/** Said once after every link that opens a new tab. */
function NewTab() {
  return (
    <>
      <svg className="mx-ext" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M4 2h6v6M10 2 3 9" />
      </svg>
      <span className="mx-sr"> (opens in a new tab)</span>
    </>
  )
}

function ExternalLink({
  href,
  className,
  children,
  track,
}: {
  href: string
  className: string
  children: ReactNode
  track?: Record<string, string>
}) {
  const data = track
    ? Object.fromEntries(
        Object.entries(track).map(([k, v]) => [`data-${k}`, v]),
      )
    : {}
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...data}
    >
      {children}
      <NewTab />
    </a>
  )
}

function yearsLabel(years: string[]): string {
  if (years.length < 2) return years[0] ?? ''
  return `${years[0]}–${years.at(-1)}`
}

/* ------------------------------------------------------------ /blog -- */

function MissionRow({ mission }: { mission: Mission }) {
  return (
    <a
      className="mx-li mx-mission"
      href={`/blog/${mission.slug}`}
      data-track="blog_click"
      data-slug={mission.slug}
      data-vt-name={transitionName('blog', mission.slug)}
    >
      <SelBar />
      <span className="mx-n">{pad2(mission.num)}</span>
      <span className="mx-t">{mission.title}</span>
      <span className="mx-m">{mission.month}</span>
      <span className="mx-intel">{mission.intel}</span>
      <span className="mx-tier">
        <TierPips tier={mission.tier} />
        {TIERS[mission.tier]} · {mission.minutes} min
      </span>
    </a>
  )
}

export function BlogIndexPage({ campaign, counts, toolbar }: ContentPageProps) {
  const { missions, playlists } = campaign
  const popular = POPULAR_SLUGS.map((slug) =>
    missions.find((mission) => mission.slug === slug),
  ).filter((mission): mission is Mission => mission !== undefined)
  return (
    <PageShell
      toolbar={toolbar}
      crumbs={[MAIN_MENU, { label: 'Campaign' }]}
      back={BACK_TO_MENU}
      counts={counts}
    >
      <ScreenHead
        title="Campaign"
        sub={`Mission select · ${missions.length} missions`}
      />
      <div className="mx-split">
        <section className="mx-panel mx-listp" aria-labelledby="mx-missions">
          <PanelHead
            id="mx-missions"
            aside={`${campaign.firstYear} — ${campaign.lastYear}`}
          >
            Missions
          </PanelHead>
          <ol className="mx-list">
            {missions.map((mission) => (
              <li key={mission.slug}>
                <MissionRow mission={mission} />
              </li>
            ))}
          </ol>
          <div className="mx-list-foot">
            <span>{missions.length} missions</span>
            <span>Newest first</span>
          </div>
        </section>
        <div className="mx-side">
          <section className="mx-panel" aria-labelledby="mx-priority">
            <PanelHead id="mx-priority" aside="Most played">
              Priority targets
            </PanelHead>
            <ul className="mx-cards">
              {popular.map((mission) => (
                <li key={mission.slug}>
                  <a
                    className="mx-card"
                    href={`/blog/${mission.slug}`}
                    data-track="blog_click"
                    data-slug={mission.slug}
                    data-vt-name={transitionName('blog', mission.slug)}
                  >
                    <Plate
                      seed={mission.slug}
                      kind="land"
                      className="mx-card-plate"
                    />
                    <span className="mx-card-cap">
                      <small>Mission {pad2(mission.num)}</small>
                      <span className="mx-card-t">{mission.title}</span>
                      <span className="mx-card-m">
                        {TIERS[mission.tier]} · {mission.minutes} min
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
          <section
            className="mx-panel"
            id="matchmaking"
            aria-labelledby="mx-mm"
            tabIndex={-1}
          >
            <PanelHead id="mx-mm" aside="vercel.com">
              Matchmaking
            </PanelHead>
            <p className="mx-note">
              Playlists published on vercel.com · {playlists.length} online
            </p>
            <ul className="mx-list mx-list-flat">
              {playlists.map((playlist, index) => (
                <li key={playlist.href}>
                  <ExternalLink
                    className="mx-li mx-playlist"
                    href={playlist.href}
                  >
                    <SelBar />
                    <span className="mx-n">{pad2(index + 1)}</span>
                    <span className="mx-t">{playlist.title}</span>
                    <span className="mx-m">{playlist.year}</span>
                    <span className="mx-intel">{playlist.description}</span>
                  </ExternalLink>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </PageShell>
  )
}

/* ----------------------------------------------------------- /notes -- */

export function NotesIndexPage({
  campaign,
  counts,
  toolbar,
}: ContentPageProps) {
  const { films } = campaign
  const latest = films[0]
  const total = films.reduce((sum, film) => sum + film.secs, 0)
  return (
    <PageShell
      toolbar={toolbar}
      crumbs={[MAIN_MENU, { label: 'Theater' }]}
      back={BACK_TO_MENU}
      counts={counts}
    >
      <ScreenHead title="Theater" sub={`Saved films · ${films.length} clips`} />
      <div className="mx-split">
        <section className="mx-panel mx-listp" aria-labelledby="mx-films">
          <PanelHead id="mx-films" aside="Notebook">
            Saved films
          </PanelHead>
          <ul className="mx-list">
            {films.map((film) => (
              <li key={film.slug}>
                <a
                  className="mx-li mx-film-row"
                  href={`/notes/${film.slug}`}
                  data-vt-name={transitionName('note', film.slug)}
                >
                  <SelBar />
                  <Plate seed={film.slug} kind="film" className="mx-thumb" />
                  <span className="mx-t">{film.title}</span>
                  <span className="mx-m">{filmTime(film.secs)}</span>
                  <span className="mx-intel">
                    {film.date} · {film.type}
                    {film.intel ? ` · ${film.intel}` : ''}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="mx-list-foot">
            <span>{films.length} films</span>
            <span>{filmTime(total)} total</span>
          </div>
        </section>
        {latest && (
          <div className="mx-side">
            <section className="mx-panel" aria-labelledby="mx-showing">
              <PanelHead id="mx-showing" aside="Latest clip">
                Now showing
              </PanelHead>
              <div className="mx-shot mx-shot-tall">
                <Plate seed={latest.slug} kind="film" className="mx-shot-art" />
                <div className="mx-shot-tl" aria-hidden="true">
                  <span>● Rec</span>
                  <span>{filmTime(latest.secs)}</span>
                </div>
                <div className="mx-shot-cap">
                  <small>{latest.date}</small>
                  <span className="mx-shot-t">{latest.title}</span>
                </div>
              </div>
              <div className="mx-dbody">
                <p className="mx-brief">{latest.intel}</p>
                <dl className="mx-kvs">
                  <div>
                    <dt className="mx-lab">Length</dt>
                    <dd className="mx-kv">
                      {filmTime(latest.secs)}
                      <small>{latest.words} words</small>
                    </dd>
                  </div>
                  <div>
                    <dt className="mx-lab">Recorded</dt>
                    <dd className="mx-kv">
                      {latest.date}
                      <small>{latest.type}</small>
                    </dd>
                  </div>
                </dl>
                <a className="mx-cta" href={`/notes/${latest.slug}`}>
                  Play film
                </a>
              </div>
            </section>
          </div>
        )}
      </div>
    </PageShell>
  )
}

/* -------------------------------------------------------- /projects -- */

function hostOf(link: string): string {
  return link.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function ObjectRow({ object }: { object: ForgeObject }) {
  const body = (
    <>
      <SelBar />
      <ObjectIcon cat={object.cat} />
      <span className="mx-t">{object.name}</span>
      <span className="mx-m">{yearsLabel(object.years)}</span>
      <span className="mx-intel">{object.description}</span>
    </>
  )
  return object.external ? (
    <ExternalLink
      className="mx-li mx-object"
      href={object.link}
      track={{ track: 'project_click', project: object.id }}
    >
      {body}
    </ExternalLink>
  ) : (
    <a
      className="mx-li mx-object"
      href={object.link.startsWith('/') ? object.link : `/${object.link}`}
      data-track="project_click"
      data-project={object.id}
    >
      {body}
    </a>
  )
}

export function ProjectsPage({ campaign, counts, toolbar }: ContentPageProps) {
  const { objects } = campaign
  const categories = [...new Set(objects.map((object) => object.cat))]
  const featured = objects[0]
  return (
    <PageShell
      toolbar={toolbar}
      crumbs={[MAIN_MENU, { label: 'Forge' }]}
      back={BACK_TO_MENU}
      counts={counts}
    >
      <ScreenHead
        title="Forge"
        sub={`Object palette · ${objects.length} items`}
      />
      <div className="mx-split">
        <section className="mx-panel mx-listp" aria-labelledby="mx-palette">
          <PanelHead id="mx-palette" aside={`${categories.length} categories`}>
            Palette
          </PanelHead>
          <div className="mx-list">
            {categories.map((cat: ForgeCategory) => (
              <section key={cat} aria-labelledby={`mx-cat-${cat}`}>
                <h3 className="mx-cat" id={`mx-cat-${cat}`}>
                  {CATEGORY_NAMES[cat]}
                </h3>
                <ul>
                  {objects
                    .filter((object) => object.cat === cat)
                    .map((object) => (
                      <li key={object.id}>
                        <ObjectRow object={object} />
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
          <div className="mx-list-foot">
            <span>Objects placed {objects.length} / 16</span>
            <span className="mx-meter" aria-hidden="true">
              <i style={{ width: `${(objects.length / 16) * 100}%` }} />
            </span>
          </div>
        </section>
        {featured && (
          <div className="mx-side">
            <section className="mx-panel" aria-labelledby="mx-props">
              <PanelHead
                id="mx-props"
                aside={`ID ${String(hashStr(featured.name) % 100000).padStart(5, '0')}`}
              >
                Object properties
              </PanelHead>
              <div className="mx-forge-view">
                <Wireframe
                  seed={featured.name}
                  cat={featured.cat}
                  className="mx-forge-art"
                />
                <div className="mx-forge-ov" aria-hidden="true">
                  <span>
                    Edit mode · <b>Pivot</b>
                  </span>
                  <span>Snap 0.25 · Rot 15°</span>
                </div>
              </div>
              <table className="mx-props">
                <tbody>
                  <tr>
                    <th scope="row">Name</th>
                    <td className="mx-props-name">{featured.name}</td>
                  </tr>
                  <tr>
                    <th scope="row">Category</th>
                    <td>{CATEGORY_NAMES[featured.cat]}</td>
                  </tr>
                  <tr>
                    <th scope="row">Description</th>
                    <td>{featured.description}</td>
                  </tr>
                  <tr>
                    <th scope="row">Spawn at</th>
                    <td>
                      <ExternalLink className="mx-inline" href={featured.link}>
                        {hostOf(featured.link)}
                      </ExternalLink>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>
        )}
      </div>
    </PageShell>
  )
}

/* ----------------------------------------------------------- /about -- */

const CONTACTS = [
  {
    tag: 'GH',
    name: 'GitHub',
    meta: '/maxleiter',
    href: 'https://github.com/maxleiter',
  },
  {
    tag: 'X',
    name: 'Twitter',
    meta: '@maxleiter',
    href: 'https://twitter.com/maxleiter',
  },
  {
    tag: 'IN',
    name: 'LinkedIn',
    meta: '/in/MaxLeiter',
    href: 'https://www.linkedin.com/in/MaxLeiter',
  },
]

function YearChart({
  years,
  busiest,
}: {
  years: [number, number][]
  busiest: number
}) {
  const W = 420
  const H = 150
  const max = Math.max(1, ...years.map(([, n]) => n))
  const bw = W / Math.max(1, years.length)
  return (
    <svg
      className="mx-chart-svg"
      viewBox={`0 0 ${W} ${H + 22}`}
      role="img"
      aria-label={`Posts per year: ${years.map(([y, n]) => `${y}, ${n}`).join('; ')}`}
    >
      <defs>
        <linearGradient id="mx-amber" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff0c4" />
          <stop offset=".5" stopColor="#ffc46b" />
          <stop offset="1" stopColor="#b97a22" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const y = (H - f * (H - 26)).toFixed(1)
        return <line key={f} x1="0" x2={W} y1={y} y2={y} className="mx-grid" />
      })}
      <line x1="0" x2={W} y1={H} y2={H} className="mx-axis" />
      {years.map(([year, n], i) => {
        const h = (n / max) * (H - 26)
        const x = i * bw + bw * 0.18
        const hot = year === busiest
        const mid = (x + bw * 0.32).toFixed(1)
        return (
          <g key={year}>
            <rect
              x={x.toFixed(1)}
              y={(H - h).toFixed(1)}
              width={(bw * 0.64).toFixed(1)}
              height={h.toFixed(1)}
              className={hot ? 'mx-bar-hot' : 'mx-bar-col'}
            />
            <text
              className="mx-v"
              x={mid}
              y={(H - h - 7).toFixed(1)}
              textAnchor="middle"
            >
              {n}
            </text>
            <text x={mid} y={H + 16} textAnchor="middle">
              {`’${String(year).slice(2)}`}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function AboutPage({ campaign, counts, toolbar }: ContentPageProps) {
  const { record } = campaign
  const progress = record.next
    ? ((record.xp - record.prevXp) / (record.next.xp - record.prevXp)) * 100
    : 100
  const stats: [string | number, string][] = [
    [counts.missions, 'Missions'],
    [counts.films, 'Saved films'],
    [counts.objects, 'Objects forged'],
    [counts.playlists, 'Matches'],
    [record.span.toFixed(1), 'Years in service'],
    [record.busiest[0], `Best year · ${record.busiest[1]} missions`],
    [record.streak, 'Year streak'],
    [record.silence, 'Longest silence (days)'],
  ]
  const earned = record.medals.filter((medal) => medal.on).length
  const records =
    counts.missions + counts.films + counts.objects + counts.playlists
  return (
    <PageShell
      toolbar={toolbar}
      crumbs={[MAIN_MENU, { label: 'Service record' }]}
      back={BACK_TO_MENU}
      counts={counts}
    >
      <ScreenHead title="Service Record" sub="Personnel file · Max Leiter" />
      <div className="mx-sr-grid">
        <section className="mx-panel mx-sr-card" aria-labelledby="mx-tag">
          <PanelHead id="mx-tag" aside="ML26">
            Service tag
          </PanelHead>
          <div className="mx-sr-id">
            <Emblem id="mx-e2" />
            <div>
              <p className="mx-gt">Max Leiter</p>
              <p className="mx-gt-row">
                <RankIcon />
                <span>{record.rank}</span>
              </p>
            </div>
          </div>
          <div className="mx-xp">
            <div className="mx-xp-row">
              <span>{record.xp.toLocaleString('en-US')} XP</span>
              <span>
                {record.next
                  ? `Next: ${record.next.name} · ${record.next.xp.toLocaleString('en-US')}`
                  : 'Max rank'}
              </span>
            </div>
            <div className="mx-meter mx-meter-xp" aria-hidden="true">
              <i style={{ width: `${progress.toFixed(1)}%` }} />
            </div>
          </div>
          <div className="mx-sr-blurb">
            <p>
              I'm currently working on Claude Code at Anthropic. Previously, I
              helped start{' '}
              <ExternalLink className="mx-inline" href="https://v0.app">
                v0
              </ExternalLink>{' '}
              and the{' '}
              <ExternalLink className="mx-inline" href="https://ai-sdk.dev">
                AI SDK
              </ExternalLink>{' '}
              at Vercel. I'm interested in politics, tech, and building a fast,
              accessible web.
            </p>
            <h3 className="mx-lab">This site</h3>
            <p>
              This site was previously built with{' '}
              <ExternalLink className="mx-inline" href="https://nextjs.org">
                Next.js
              </ExternalLink>
              , but has been replaced with a{' '}
              <a className="mx-inline" href="/blog/thank-u-next">
                vibe-coded framework
              </a>
              . It's deployed via{' '}
              <ExternalLink
                className="mx-inline"
                href="https://vercel.com/home"
              >
                Vercel
              </ExternalLink>{' '}
              and you can view the source on{' '}
              <ExternalLink
                className="mx-inline"
                href="https://github.com/maxleiter/maxleiter.com"
              >
                GitHub
              </ExternalLink>
              .
            </p>
          </div>
          <h3 className="mx-lab mx-links-h" id="mx-contact">
            Contact
          </h3>
          <ul className="mx-links" aria-labelledby="mx-contact">
            {CONTACTS.map((contact) => (
              <li key={contact.name}>
                <ExternalLink className="mx-li mx-contact" href={contact.href}>
                  <SelBar />
                  <span className="mx-n">{contact.tag}</span>
                  <span className="mx-t">{contact.name}</span>
                  <span className="mx-m">{contact.meta}</span>
                </ExternalLink>
              </li>
            ))}
          </ul>
        </section>
        <div className="mx-sr-right">
          <section className="mx-panel" aria-labelledby="mx-career">
            <PanelHead
              id="mx-career"
              aside={`Computed from ${records} records`}
            >
              Career
            </PanelHead>
            <dl className="mx-stats">
              {stats.map(([value, label]) => (
                <div className="mx-stat" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <div className="mx-sr-lower">
            <section className="mx-panel" aria-labelledby="mx-per-year">
              <PanelHead
                id="mx-per-year"
                aside={`${record.years[0]?.[0] ?? ''}–${record.years.at(-1)?.[0] ?? ''}`}
              >
                Missions per year
              </PanelHead>
              <div className="mx-chart">
                <YearChart years={record.years} busiest={record.busiest[0]} />
              </div>
            </section>
            <section className="mx-panel" aria-labelledby="mx-medals">
              <PanelHead
                id="mx-medals"
                aside={`${earned} / ${record.medals.length}`}
              >
                Medals
              </PanelHead>
              <ul className="mx-medals">
                {record.medals.map((medal, index) => (
                  <li
                    key={medal.id}
                    className={medal.on ? 'mx-medal' : 'mx-medal mx-locked'}
                  >
                    <MedalIcon
                      icon={medal.id}
                      color={medal.color}
                      id={`mx-m${index}`}
                    />
                    <span className="mx-medal-t">
                      <b>{medal.name}</b>
                      {medal.on ? (
                        ''
                      ) : (
                        <span className="mx-medal-lock"> · Locked</span>
                      )}
                      <span className="mx-medal-d">{medal.desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

/* ---------------------------------------------------- /labs, /talks -- */

export function LabsPage({ counts, toolbar }: ContentPageProps) {
  return (
    <PageShell
      toolbar={toolbar}
      crumbs={[MAIN_MENU, { label: 'Custom games' }]}
      back={BACK_TO_MENU}
      counts={counts}
    >
      <ScreenHead
        title="Custom Games"
        sub={`Labs · ${LABS.length} experimental maps`}
      />
      <div className="mx-split">
        <section className="mx-panel mx-listp" aria-labelledby="mx-labs">
          <PanelHead id="mx-labs" aside="Experimental projects and playthings">
            Custom games
          </PanelHead>
          <ul className="mx-list">
            {LABS.map((lab, index) => {
              const body = (
                <>
                  <SelBar />
                  <span className="mx-n">{pad2(index + 1)}</span>
                  <span className="mx-t">{lab.name}</span>
                  <span className="mx-m">
                    {lab.url.startsWith('/')
                      ? 'Briefing'
                      : hostOf(lab.url).split('/')[0]}
                  </span>
                  <span className="mx-intel">{lab.description}</span>
                </>
              )
              return (
                <li key={lab.id}>
                  {lab.url.startsWith('/') ? (
                    <a className="mx-li" href={lab.url}>
                      {body}
                    </a>
                  ) : (
                    <ExternalLink className="mx-li" href={lab.url}>
                      {body}
                    </ExternalLink>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
        <div className="mx-side">
          <section className="mx-panel" aria-labelledby="mx-forge-note">
            <PanelHead id="mx-forge-note" aside="Forge mode">
              Map editor
            </PanelHead>
            <div className="mx-shot mx-shot-tall">
              <Plate seed="labs" kind="land" className="mx-shot-art" />
              <div className="mx-shot-cap">
                <small>Community maps</small>
                <span className="mx-shot-t">Built for fun</span>
              </div>
            </div>
            <p className="mx-note mx-note-body">
              Weekend builds, prototypes and toys. Some of them shipped; all of
              them taught something.
            </p>
          </section>
        </div>
      </div>
    </PageShell>
  )
}

/** `1:01:49` -> seconds. */
function durationSecs(duration: string): number {
  return duration
    .split(':')
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0)
}

export function TalksPage({ counts, toolbar }: ContentPageProps) {
  const total = TALKS.reduce(
    (sum, talk) => sum + durationSecs(talk.duration),
    0,
  )
  const hours = Math.floor(total / 3600)
  const minutes = Math.round((total % 3600) / 60)
  return (
    <PageShell
      toolbar={toolbar}
      crumbs={[MAIN_MENU, { label: 'Broadcasts' }]}
      back={BACK_TO_MENU}
      counts={counts}
    >
      <ScreenHead title="Broadcasts" sub="Talks I like · community films" />
      <div className="mx-split">
        <section className="mx-panel mx-listp" aria-labelledby="mx-talks">
          <PanelHead id="mx-talks" aside={`${TALKS.length} broadcasts`}>
            Talks I like
          </PanelHead>
          <ul className="mx-list">
            {TALKS.map((talk, index) => (
              <li key={talk.id}>
                <ExternalLink
                  className="mx-li"
                  href={`https://www.youtube.com/watch?v=${talk.videoId}`}
                >
                  <SelBar />
                  <span className="mx-n">{pad2(index + 1)}</span>
                  <span className="mx-t">{talk.title}</span>
                  <span className="mx-m">{talk.duration}</span>
                  <span className="mx-intel">{talk.channel}</span>
                </ExternalLink>
              </li>
            ))}
          </ul>
        </section>
        <div className="mx-side">
          <section className="mx-panel" aria-labelledby="mx-runtime">
            <PanelHead id="mx-runtime" aside="Total runtime">
              Playlist
            </PanelHead>
            <div className="mx-shot mx-shot-tall">
              <Plate seed="talks" kind="film" className="mx-shot-art" />
              <div className="mx-shot-tl" aria-hidden="true">
                <span>● Live</span>
              </div>
              <div className="mx-shot-cap">
                <small>{TALKS.length} broadcasts</small>
                <span className="mx-shot-t">
                  {hours} h {minutes} min of talks
                </span>
              </div>
            </div>
            <p className="mx-note mx-note-body">
              Conference talks, postmortems and demos worth the time, from the
              Apollo Guidance Computer to TypeScript types running DOOM.
            </p>
          </section>
        </div>
      </div>
    </PageShell>
  )
}

/* ------------------------------------------------------------- /404 -- */

export function NotFoundPage({ counts }: { counts: MeridianCounts }) {
  return (
    <PageShell
      crumbs={[MAIN_MENU, { label: 'Signal lost' }]}
      back={BACK_TO_MENU}
      counts={counts}
    >
      <ScreenHead
        title="Signal Lost"
        sub="Error 404 · No route to destination"
      />
      <section className="mx-panel mx-lost" aria-labelledby="mx-lost">
        <PanelHead id="mx-lost" aside="404">
          Connection
        </PanelHead>
        <div className="mx-dbody">
          <p className="mx-brief">That page does not exist.</p>
          <a className="mx-cta" href="/">
            Return to main menu
          </a>
        </div>
      </section>
    </PageShell>
  )
}
