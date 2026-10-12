import { Island } from '@framework/render/islands'
import { CommandPalette } from '@components/blades/chrome'
import { Dashboard } from '@components/blades/dashboard'
import { buildHome, type HomeContent } from '@components/blades/home-model'
import type { BladesProps } from '@islands/blades'

/**
 * The blades dashboard, server-rendered from the real content.
 *
 * The dashboard is complete markup on its own (see `Dashboard`). The `blades`
 * island is its sibling with an empty fallback: it adds behaviour to markup it
 * finds by id and renders none of its own, which is the shot grid's pattern
 * and why nothing here has to be reproduced exactly by a client render. Its
 * props are what the previews need that the rows do not show.
 *
 * The clock script and the command palette sit outside the island too. The
 * script writes the clock before first paint, so the bar does not flash
 * `--:--`; the island takes the clock over once it mounts.
 */

const CLOCK_SCRIPT =
  `var c=document.getElementById('clock');` +
  `if(c)c.textContent=new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})`

export function HomePage(content: HomeContent) {
  const { blades, card } = buildHome(content)
  const props: BladesProps = { blades: blades.map((b) => b.items), card }
  return (
    <>
      <Dashboard blades={blades} card={card} />
      <script dangerouslySetInnerHTML={{ __html: CLOCK_SCRIPT }} />
      <Island name="blades" on="load" props={props}>
        {null}
      </Island>
      <CommandPalette />
    </>
  )
}
