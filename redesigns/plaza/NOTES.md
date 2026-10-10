# Plaza

**Concept.** maxleiter.com as a friendly 2006-era motion-control console home menu. A boot "Opinions and Safety" warning, then a 4x3 wall of silver-bezeled glass "TV" tiles, each running a live Canvas2D preview: Blog flips through post titles in a little book, Notes types its titles onto sticky notes, Projects spins three flat-shaded solids, Work scrolls headlines with a ticker, About has an original waving character, Forecast reports the build time as weather, and Jukebox plays an original procedural loop. The bottom bar has two chrome orbs (Settings, Message Board), a sound pill, and the big grey clock. Click a tile and it zooms into a channel splash with Menu/Start pills, then the real content (lists, sticky notes, cards, readable articles). The envelope opens a calendar Message Board of every post, note and work piece by date.

**Tech.**
- View Transitions API for the tile-to-channel and envelope-to-board zoom. A manual FLIP fallback (WAAPI on the overlay) covers browsers without it; `?flip` forces the fallback path.
- One shared rAF loop drives every canvas. IntersectionObserver culls tiles that are off-screen (other phone pages), and nothing on the menu is drawn while a channel is open.
- `@property --sweep` animates the glass-glare sweep across each bezel, staggered per tile.
- WebAudio, all synthesized: hover bloops pitched on a pentatonic scale, select dings, filtered-noise whooshes, and an 8-bar jingle (FM e-piano, mallet lead, triangle bass, brushed noise, generated reverb). The melody grows from a seed with motif repetition; Remix gives a new tune over the same chords. Everything stays muted until the user turns it on.
- A hand pointer with spring smoothing, low-amplitude "IR jitter" and velocity tilt; the Gamepad API (stick/d-pad, face buttons, shoulders to change pages, right stick steers the hand, rumble on focus moves); DeviceOrientation tilt parallax with the iOS permission prompt.
- Phones get a 2-column grid in scroll-snap pages with dots, and the tile height adapts to the screen.

**Real vs faked.** All content is real (`content.json`). The forecast numbers come from `docs/ARCHITECTURE.md`. Articles show the excerpt through a small markdown renderer, then link to the full post. The character, icons, sounds and music are all original; no trademarks or sampled assets. The previews are pure canvas drawing, with no images.

**Support.** Chromium 111+ and Safari 18+ get View Transitions; any browser without `startViewTransition` (older Firefox and Safari) takes the FLIP path. `color-mix` needs Chromium 111, Safari 16.2 or Firefox 113. A guard skips any transition whose capture never fires. Headless Chromium with `--use-angle=swiftshader` never captured a transition, which is why that guard exists.

**Mapping onto the real build.** The menu, every list and every article would be SSG HTML; the DOM is already the source of truth. The canvas previews, sound and pointer would be one island, loaded after first paint. That is the honest cost: about 65 KB gzip as a single file today (roughly 18 KB of that is embedded content, about 31 KB is JS and 11 KB is CSS), against the site's 17 KB homepage budget. Splitting audio and the Jukebox off as lazy imports, plus static first-frame posters for the tiles, gets the menu island near 20 KB. Channel zooms map onto the existing router's view transitions with `transitionName()`. `src/` holds the source; `node build.mjs` inlines it into `index.html`.

**Video.** `demo.mp4` (14.5 s, H.264, 1280x720, 2.2 MB) was rendered frame by frame. An init script virtualizes `performance.now`, rAF and `setTimeout`, and seeks every `document.getAnimations()` entry to a fixed 30 fps clock. It records with `?flip` because headless capture does not seek view-transition pseudo-element geometry. The screenshots use the real View Transitions path.

## Accessibility

**Verified, and how:**
- **axe-core 4.10.2.** Injected through Playwright only, from the npm tarball, because the CDN was blocked by the sandbox proxy; it is never shipped. I ran it in 17 states: boot, home, settings, splash, all 8 channel lists, an open article, the message board, an open letter, mobile home and mobile board.
  - Before: 73 serious/critical nodes. That was 54 color-contrast, 16 ARIA grid parent/child errors on the calendar, 2 unnamed switches and 1 unfocusable scroll region.
  - After: 0 violations of any impact in every state.
- **Real DOM.** Every canvas is `aria-hidden` and only duplicates DOM text, except the Jukebox piano roll, which is `role="img"` with a label. Tiles are buttons with real text names. Lists are `ul/li`, and articles are headings plus paragraphs, so find-in-page works on the content.
- **Landmarks and headings.**
  - Landmarks: `<main>` for the menu, and `<nav>` for the dock and the year strip.
  - Headings: one `h1` per view (menu, channel, board, boot), with `h2` for articles and sections.
  - `document.title` follows the channel and article. A Skip to content link focuses the current view's first control.
- **Focus.**
  - The focus ring is a 3px dark blue outline with a white halo (`#0b5a86`, about 7:1). It is separate from the cyan hover glow and never removed.
  - The hand pointer is pointer-only and hides as soon as a key is pressed.
  - Arrow keys and the gamepad move real DOM focus, so Tab and spatial navigation agree, and hovering a tile takes focus with it.
  - Channel, board, letter, settings and boot are modal: the rest is `inert`, Tab is trapped in the top layer (tested with Playwright), Esc steps back, and focus returns to the opener (tile, envelope, article row or letter).
- **Screen readers.**
  - A debounced `aria-live="polite"` region announces arrow/gamepad focus moves, page changes, month changes and channel opens. Toasts are `role="status"`.
  - Widget states: year chips use `aria-pressed`, calendar days use `aria-pressed` and `aria-current="date"`, settings toggles are `role="switch"` with labels, and the year strip uses `aria-current`.
- **Contrast.** Muted text was darkened to `#575e66`; the worst case is the footer gradient at about 4.4–5:1. Chips, tags and date badges use darkened channel colours. The clock is about 3.2:1 and the date about 4.3:1, which passes because both are large text.
- **Motion.** `prefers-reduced-motion` and a Settings "Reduce motion" switch give the calm version:
  - Zooms become a 0.25 s crossfade.
  - Previews freeze on one frame.
  - Stripes, glare, rumble, parallax, hand jitter and tilt all stop.
  - Nothing blinks faster than about 1.3 Hz.
- **Sound.** Muted by default. The labelled sound pill (`aria-pressed`) and the Settings switches are keyboard-reachable, and nothing is conveyed only by sound.
- **Input.** Keyboard, mouse, touch and gamepad all work. Targets are at least 44px: pills, chips, toggles, arrows, and the year buttons that replaced the tiny month pips. Zoom is not disabled. At 640x360 (200% zoom) the layout reflows to one row of two tiles per page with no horizontal scroll.
- **No JS.** A server-rendered fallback lists all posts, notes, projects and work with working links (55 links). It is hidden only once the app has booted, so a script error leaves it readable.

**Known gaps:**
- I tested with axe and keyboard scripts, not with a real screen reader (VoiceOver or NVDA), so the live-region wording is unverified by ear.
- Contrast was not checked for the decorative canvas text, which is aria-hidden and duplicated in the DOM.
- The gamepad was tested by code review only, because there was no device.
- On phones, swiping between pages is native scroll-snap. Switch-access users get the dots only as decoration, though focus moves pages automatically.
- Article heading focus shows the ring on deep-link load, which is slightly heavy visually.
