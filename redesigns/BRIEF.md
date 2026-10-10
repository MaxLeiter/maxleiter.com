# Shared brief — maxleiter.com redesign prototypes

You are building ONE drastic redesign concept for Max Leiter's personal site
(maxleiter.com), styled as a 2000s video-game/console UI. The bar: someone
glancing at a screenshot should genuinely wonder if it's a real 2006-2009 console
dashboard or game menu. Studio-quality polish, not a CSS demo.

## Deliverable
- `redesigns/<your-slug>/index.html` — runnable by opening the file (or a static
  server). Prefer a single self-contained file. Extra local files (js/css/
  textures you GENERATE procedurally or author yourself) are fine in your folder.
- `redesigns/<your-slug>/NOTES.md` — 15-30 lines: the concept, the tech tricks,
  what's real vs faked, browser support/fallbacks, and how it would map onto
  the real site build (see `docs/ARCHITECTURE.md` — static SSG, islands, tiny JS
  budget; be honest about what this costs).
- `redesigns/<your-slug>/shot-*.png` — 2-4 Playwright screenshots at 1280x720
  (plus one 390x844 mobile) of the final state.

## Content
Use REAL content from `redesigns/content.json` (posts, notes, projects/external
work, site blurb). Link items to `https://maxleiter.com<href>` for internal
hrefs. Include: home/dashboard, blog list, notes, projects, about/contact, and
some "open an article" state that shows readable prose (use `excerpt`).

## Hard rules
- NO real trademarks or copied assets: no Xbox/Microsoft/PlayStation/Sony/
  Nintendo/Wii/Halo/Bungie names, logos, glyphs, button-letter icons in their
  exact colors-as-branding, sampled sounds, or copied fonts. Evoke the ERA's
  design language with original work. Original procedural art/sound only.
- External scripts only from cdnjs.cloudflare.com, cdn.jsdelivr.net/npm/ or
  unpkg.com with an exact pinned version; stylesheets only from Google Fonts.
  Zero-dependency is preferred and more impressive.
- Must be usable: keyboard navigable (arrows/enter/esc), mouse/touch, and work
  at phone width with no horizontal page scroll. Respect
  `prefers-reduced-motion`. Sound must be opt-in or start muted until a user
  gesture (browsers block autoplay anyway) with a visible toggle.
- 60fps target. Don't ship multi-MB payloads.
- Gamepad API navigation is a great touch where it fits.

## Verify your own work
Chromium is at `/opt/pw-browsers`; Node Playwright is available globally
(`NODE_PATH=$(npm root -g) node script.mjs`, `import { chromium } from
'playwright'`). Use `--use-gl=angle --use-angle=swiftshader` (or
`--enable-unsafe-swiftshader`) args for WebGL headless. Take screenshots, LOOK
at them with the Read tool, and iterate until it's genuinely beautiful. Check
the console for errors. Write scripts in your folder or the scratchpad, not
elsewhere. Do NOT modify anything outside `redesigns/<your-slug>/`. Do not
commit or push.

Report back: slug, a 2-3 sentence pitch, the tech list, known issues.
