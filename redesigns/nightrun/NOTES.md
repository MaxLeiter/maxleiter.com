# NIGHTRUN: maxleiter.com as a 2004 street-racing game menu

**Concept.** The site is the main menu of an original, made-up night street-racing game. It opens on a PRESS START title with a chrome-and-neon "MAX LEITER" wordmark. Behind the menu, a low-poly sports car turns on a wet turntable in a rain-soaked neon lot. The menu entries map to the site's sections:

- **Career** is the blog. Each post is a race on a tilted city map, placed in a district by year, with a route and an event card, and "Race" opens the article.
- **Quick Race** is the notes, shown as a lap-time list.
- **Garage** is the projects, shown as tunable parts with stat bars. The car repaints with a sweep as you browse.
- **Crew** is the Vercel posts, shown as a crew roster.
- **Profile** is a driver licence with stats computed from the content.
- **Options** covers sound, motion and quality.

Loading screens between screens show tips built from real post titles ("TIP: Pin your npm/yarn dependencies").

**Tech (zero dependencies, around 27 KB of JS gzipped before minifying).**
- The `src/scene.js` WebGL2 renderer draws an HDR main pass (RGBA16F with 4x MSAA, resolved by blit).
- The floor reflection is planar: the scene is drawn again mirrored at half resolution, then mipmapped. The floor samples it at a LOD driven by a puddle mask, and rain-ripple normals distort it.
- The rain runs on the GPU with instancing: 2.5k–6.5k camera-facing streaks whose positions come only from seed and time.
- Background light trails are instanced. A volumetric light cone sits over the car.
- The procedural sky has two skyline layers with lit windows and signs.
- Bloom is a six-level down/up chain with a procedural lens-dirt texture and a horizontal streak.
- The post pass adds ACES tonemapping, radial chromatic aberration, vignette and grain.
- Handheld camera sway is built from summed sines.
- Dynamic resolution steps the render scale from 0.5 to 1.0 based on frame time.
- The car is lofted from 13 cross-sections. Creases are hard and the surface is smooth along its length. Wheel arches are cut in the shader. Headlights, tail lights, grille and vinyl are drawn from object-space masks.
- The paint shader is a clearcoat over an analytic environment of softboxes, neon pillars and a city band.
- The logo is SVG: a `feSpecularLighting` bevel, a chrome gradient, an extruded stack, a neon outline and a clipped glint.
- Menu bars slide in with a horizontal-blur smear: CSS keyframes that step through `filter:url(#hb3→hb1)`.
- `src/audio.js` synthesizes everything:
  - a 132 BPM electro breakbeat (sine/noise drums, a saw+square bass through a resonant LP, a square arp with a sweeping filter and a delay, a pad, a procedural plate reverb);
  - UI sounds: whoosh, clunk, rev blip, tick and a paint hiss.
- Input works with keys, mouse (hover selects), touch (first tap selects, second tap activates) and the Gamepad API (D-pad or stick, A/B/Start, auto-repeat, neutral round glyphs).

**Real vs faked.**
- **Real:** HDR, MSAA, planar reflections, bloom and GPU rain.
- **Faked:** the "screen-space" wet look is planar reflection plus roughness blur. Ripples are procedural normals, not simulated. The env reflection is analytic, not a cubemap. There are no shadows except a contact-shadow box under the car.
- **Game stats are heuristics computed over `content.json`, not data anyone curated:**
  - difficulty is the excerpt's link/code density, ranked into quantiles;
  - part stats come from description length and technical/hype keyword hits;
  - lap times come from excerpt length;
  - crew callsigns come from title words;
  - Profile numbers are real counts.

**Support and fallbacks.**
- WebGL2 with float render targets runs everywhere current. Without `EXT_color_buffer_float` the renderer drops to RGBA8.
- With no WebGL2 (or `?nogl`) the page uses a CSS/SVG painted backdrop and keeps the same UI.
- With no JS, the same HTML reads as a plain document: every post, note, project and Vercel post is a real link.

**Mapping onto the real build.**
- `build.mjs` already works like the site's SSG. It renders every list, the map and the stat rows to static HTML from content, and embeds a small JSON blob plus `<template>` excerpts. The page is usable before any JS runs.
- In the real site the menu and the lists would be server-rendered pages with ordinary links, and the 3D backdrop would be a single `load` island.
- The cost is far over the site's budget. The site ships about 1 KB of JS per page and 17 KB on the homepage; this ships about 18–20 KB min+gz of JS, and a GPU that renders continuously. Shipping it would need a static poster frame first and the scene loaded on idle and paused when hidden.
- Sound and gamepad support are opt-in extras that cost almost nothing.

**Files and scripts.**
- `src/` holds the sources and `build.mjs` produces `index.html` (inlined, opens from `file://`).
- `shots.mjs` takes the screenshots, `a11y-audit.mjs` runs axe, and `video.mjs` produces `demo.mp4`.
- Capture is deterministic: with `?capture`, `window.__NR.advance(ms)` steps a virtual clock that drives WebGL, every JS timer and every CSS animation (through `document.getAnimations()`).
- Deep links: `?s=garage&i=3`, `&open=1`, `&rm=1`, `&q=low|med|high`, `&nogl`.

## Accessibility

**Audit.** I injected axe-core 4.10.2 from Playwright only; it is not shipped. It ran in 17 states:
- title, menu, the 6 sections, two open articles, the loading overlay;
- reduced motion, no-WebGL, three mobile states at 390×844;
- the no-JS document, with scripts stripped.

| Run | Serious/critical | Moderate | Other | States with violations |
|---|---|---|---|---|
| Before fixes | 0 | 2 (`landmark-complementary-is-top-level` from the menu's `<aside>`) | none | 2 of 17 |
| After fixes | 0 | 0 | none | 0 of 17 |

**Structure.**
- The real DOM is the source of truth. The canvas is `aria-hidden`.
- Every screen is a `<section>` inside `<main>`, with `<nav>` for the menu.
- There is one persistent `h1`. Each view has an `h2`, and cards use `h3`.
- `document.title` updates per screen and per article. A "Skip to content" link is the first focusable element.

**Focus and navigation.**
- Spatial navigation moves real DOM focus, and a `focusin` listener syncs selection, so Tab and the arrow keys always agree.
- The focus style is a white outline with a black halo and a lime glow, so it stays visible on every surface.
- The reader is a native `<dialog>` opened with `showModal`. That gives focus trapping and closes on Esc; focus then returns to the item that opened it.

**Screen readers.**
- A debounced `aria-live="polite"` region announces arrow and gamepad changes with extra card context, such as type, district, difficulty or stats.
- The loading screen is `role="status"`.
- Switches use `role="switch"` with `aria-checked`. Quality and motion are radio groups. The sound toggle is a labelled `aria-pressed` button, reachable by keyboard, and `M` also toggles it.
- Decorative SVG is `aria-hidden`, and star ratings are `role="img"` with a text label.

**Contrast.** I checked contrast by hand, because axe cannot see through the canvas. Every text block sits on a panel that is at least 86% opaque. I computed contrast against that panel composited over a white worst case:
- body text is ≥ 9:1;
- dim labels (#b4c0d4) are ≥ 8:1;
- the title-screen hint and copyright moved to 86% backing and #c8d2e0, because at 60–70% backing they would have failed against a bright frame;
- selected items use near-black text on lime.

**Chromatic aberration never reaches text.** CA exists only in the WebGL post pass. JS also sends the rects of every text container (`.tz`) to the shader, which zeroes CA inside them.

**Motion.**
- `prefers-reduced-motion`, or Options → Motion → Reduced, turns off camera sway, chromatic aberration, grain, the turntable spin, light trails, ripples, the needle wobble, glints, sheens and the PRESS START pulse.
- Slide-ins become 0.3 s crossfades, and rain is thinned and frozen.
- Nothing flashes faster than about 2 Hz. The rooftop beacons blink at 0.45 Hz. The pulse changes the glow, not opacity.

**Sound.** It is muted by default and starts only from a user gesture. No information is conveyed only by sound.

**Input.**
- Keyboard alone, mouse alone, touch alone and gamepad all work. The gamepad was tested with a stubbed `navigator.getGamepads`.
- Targets are ≥ 44 px. Zoom is not disabled.
- At 200% text size, lists ellipsize and screens scroll, and nothing scrolls horizontally at 390 px.

**Known gaps.**
- At 200% text on desktop, the Career event card can overlap the sound button.
- Map markers are not individually focusable; the list beside the map is the accessible equivalent.
- Some infinite loops (selected-bar sheen, PRESS START pulse) have no pause control other than the Motion toggle. That toggle does count as one.
- Contrast was computed, not measured on every frame of the moving backdrop.
- I did not test with a real screen reader. These checks are automated and code-reviewed.
