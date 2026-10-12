import { Island } from '@framework/render/islands'
import { countWord, type Campaign } from '@lib/meridian'
import { LABS, TALKS } from '@data/extras'
import type { MeridianCounts } from '@components/meridian/chrome'
import { Sky } from '@components/meridian/chrome'
import Home, { type HomeProps } from '@islands/home'
import Scene from '@islands/scene'
import { CommandPalette } from './shell'

/**
 * The MERIDIAN main menu, server-rendered.
 *
 * Three layers. The painted sky is plain markup, so the page is complete at
 * rest. The `scene` island draws the ring and the planet on top of it, lazily
 * and only here. The `home` island is the menu itself: its markup is the same
 * component rendered again by preact, and every entry is a real link, so the
 * homepage is a page of links with JavaScript off.
 *
 * The title screen sits outside both islands. It renders `hidden`, and the
 * inline script after it shows it only on a first visit to `/` with no
 * fragment, before first paint; any key or click dismisses it for good. With
 * JavaScript off, or for a crawler, there is no title screen at all. A soft
 * navigation back to `/` never shows it either, because the router strips
 * executable scripts from the documents it adopts.
 */

/**
 * Shows the title screen on a first visit and dismisses it on any key or
 * click. Runs during parse, so the title is up before the first frame. The
 * capture-phase key listener swallows the dismissing key, so Enter on Press
 * Start does not also follow the first menu link behind it.
 * `window.__mxStart` is how the home island dismisses it from a gamepad.
 */
const TITLE_SCRIPT =
  `(function(){var d=document,h=d.documentElement,t=d.getElementById('mx-title');` +
  `try{if(!t||location.hash||localStorage.getItem('mx.started'))return}catch(e){return}` +
  `t.hidden=false;h.setAttribute('data-title','');var done=0;` +
  `function go(e){if(done)return;if(e&&e.type=='keydown'){if(e.metaKey||e.ctrlKey||e.altKey)return;e.preventDefault();e.stopPropagation()}` +
  `done=1;try{localStorage.setItem('mx.started','1')}catch(_){}` +
  `removeEventListener('keydown',go,true);h.removeAttribute('data-title');t.setAttribute('data-out','');` +
  `dispatchEvent(new Event('mx:start'));var m=d.querySelector('.mx-mi');if(m)m.focus({preventScroll:true});` +
  `setTimeout(function(){t.hidden=true},900)}` +
  `window.__mxStart=go;addEventListener('keydown',go,true);t.addEventListener('click',go);` +
  `var b=t.querySelector('button');if(b)b.focus({preventScroll:true})})()`

function TitleScreen({
  firstYear,
  lastYear,
}: {
  firstYear: number
  lastYear: number
}) {
  return (
    <div
      id="mx-title"
      className="mx-title-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mx-logo"
      hidden
    >
      <div className="mx-logo-wrap">
        <svg className="mx-logo-arc" viewBox="0 0 1000 300" aria-hidden="true">
          <defs>
            <linearGradient id="mx-arcg" x1="0" x2="1">
              <stop offset="0" stopColor="#7fd2ff" stopOpacity="0" />
              <stop offset=".45" stopColor="#c4ecff" stopOpacity=".85" />
              <stop offset=".7" stopColor="#ffd8a0" stopOpacity=".7" />
              <stop offset="1" stopColor="#7fd2ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <ellipse
            cx="500"
            cy="150"
            rx="480"
            ry="64"
            fill="none"
            stroke="url(#mx-arcg)"
            strokeWidth="2.2"
            transform="rotate(-5 500 150)"
          />
          <ellipse
            cx="500"
            cy="150"
            rx="480"
            ry="64"
            fill="none"
            stroke="rgba(196,236,255,.18)"
            strokeWidth="9"
            transform="rotate(-5 500 150)"
          />
        </svg>
        <p className="mx-logo" id="mx-logo" data-text="Meridian">
          Meridian
        </p>
        <p className="mx-logo-sub">
          <span>Max Leiter</span>
        </p>
        <p className="mx-logo-tag">
          Field records {firstYear} — {lastYear}
        </p>
      </div>
      <button type="button" className="mx-press">
        Press Start
      </button>
      <p className="mx-title-foot">
        © {lastYear} Max Leiter · An original work · Every picture is drawn in
        your browser
      </p>
    </div>
  )
}

export interface HomePageProps {
  campaign: Campaign
  counts: MeridianCounts
}

export function HomePage({ campaign, counts }: HomePageProps) {
  const { missions, record, firstYear, lastYear } = campaign
  const latest = missions[0]
  const years = lastYear - firstYear + 1
  const props: HomeProps = {
    counts,
    rank: record.rank,
    // The lobby's slots: the two routes the menu has no mode for, and the feed.
    extras: [
      { label: 'Custom games', href: '/labs', meta: `${LABS.length} maps` },
      { label: 'Broadcasts', href: '/talks', meta: `${TALKS.length} talks` },
      { label: 'Subscribe', href: '/feed.xml', meta: 'RSS' },
    ],
    menu: [
      {
        label: 'Campaign',
        href: '/blog',
        section: 'blog',
        title: `${counts.missions} missions · ${firstYear}–${lastYear}`,
        desc: latest
          ? `${countWord(years)} years of field reports. Continue from mission ${latest.num}: “${latest.title}”.`
          : 'Field reports.',
      },
      {
        label: 'Theater',
        href: '/notes',
        section: 'notes',
        title: `${counts.films} saved films`,
        desc: 'Short clips from the notebook: snippets, tips and notes.',
      },
      {
        label: 'Forge',
        href: '/projects',
        section: 'projects',
        title: `${counts.objects} objects in the palette`,
        desc: 'Things built, shipped and open-sourced, from z80 calculators to v0.',
      },
      {
        label: 'Matchmaking',
        href: '/blog#matchmaking',
        section: 'matchmaking',
        title: `${counts.playlists} playlists online`,
        desc: 'Work published on vercel.com. Pick a playlist and find a match.',
      },
      {
        label: 'Service Record',
        href: '/about',
        section: 'about',
        title: `${record.rank} · ${record.xp.toLocaleString('en-US')} XP`,
        desc: 'Career stats, medals and contact channels for Max Leiter.',
      },
    ],
  }
  return (
    <>
      <Sky night />
      <Island name="scene" on="load">
        <Scene />
      </Island>
      <div className="mx-shade" aria-hidden="true" />
      <Island name="home" on="load" props={props}>
        <Home {...props} />
      </Island>
      <TitleScreen firstYear={firstYear} lastYear={lastYear} />
      <script dangerouslySetInnerHTML={{ __html: TITLE_SCRIPT }} />
      <CommandPalette />
    </>
  )
}
