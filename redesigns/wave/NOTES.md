# wave — a mid-2000s console dashboard, articles rendered with HTML-in-Canvas

**Concept.** A row of category icons across the screen (About, Settings, Blog, Notes, Projects, Work) with a vertical item list under the focused one. Behind it is a flowing, translucent sine ribbon over a gradient that follows your clock (dawn, day, dusk and night palettes, blended by the hour; you can override it in Settings or with `?tod=`), with sparkles drifting along the ribbon. Opening an item turns the real article HTML into a pane of glass: it springs out of the item's icon with a jelly wobble, refracts the wave behind it, a specular sheen sweeps across, and the background drops out of focus. While you scroll, the live text ripples and sloshes like water. Every icon is an inline SVG I drew. Every sound is synthesized in WebAudio and stays muted until you opt in.

**HTML-in-Canvas, as tested.** Chromium 141.0.7390.37 (Playwright build 1194), launched with `--enable-blink-features=CanvasDrawElement`. That build ships the *legacy* API generation:
- `canvas.layoutSubtree` (`<canvas layoutsubtree>`)
- 2D: `drawElement` / `drawHTMLElement`
- WebGL: `texElement2D` / `texHTMLElement2D` with the signature `(target, level, ifmt, fmt, type, element)`
- `setHitTestRegions([{element, rect}])`
- `ResizeObserver` `{fireOnEveryPaint: true}` as the repaint signal

It does **not** have the renamed `drawElementImage` / `texElementImage2D`, and has none of the current explainer's API (`content="drawable"` + `[drawable]`, `onpaint` / `requestPaint()`, `texElementSubImage2D`, `updateElementGeometry`, `getElementTransform`, `captureElementImage`). WebGPU is absent in headless (`navigator.gpu` is undefined).

The page feature-detects each name and supports both generations:
- **Current generation:** paint event, `getElementImageDefaultSize` + `texElementSubImage2D`, and `updateElementGeometry({canvasTransform, canvasClip})`.
- **Legacy generation:** ResizeObserver, `texElement2D`, and `setHitTestRegions` in device pixels.

The current-generation path is written to the 2026 explainer IDL but **untested** (I had no Canary). Settings → System Information lists every name detected live.

**Real vs faked.**
- **Real:** the sheet is a DOM `<article>` that is a direct child of the canvas.
  - Link clicks and Tab focus reach it through the hit-test regions (verified).
  - Screen readers get its headings and links, and the menu is `inert` while it is open.
  - Selection highlight and focus rings are painted into the texture.
- **Faked:** in legacy Chromium, drag-to-select does not route through the hit-test regions, so I drive selection with `caretPositionFromPoint` + `Selection.extend` (double-click selects a word).
- **Not working:** find-in-page does not see canvas children in this build. **Reading mode** (a button in every article, also in Settings) moves the same article to plain DOM, where find-in-page and native selection work.
- **Hit-test caveat:** hit testing uses the un-rippled rectangle. Ripple and slosh are capped at 3.5 CSS px, so while one runs the visuals and the click targets disagree by at most that.

**Fallback.** Without the flag, the same WebGL2 wave and depth of field still run, and the article is a normal DOM panel over the canvas:
- `backdrop-filter` glass, a CSS gloss and a sweeping sheen
- a keyframed jelly entrance that grows out of the item
- native scrolling that drives a `skewY` plus an SVG `feDisplacementMap` ripple

With no WebGL2 at all (`?mode=nogl`), a CSS gradient replaces the scene. `?mode=dom` forces the fallback in a flagged browser. The badge in the corner shows which path is active.

**Input.** Arrows, Enter, Esc, Home/End and PageUp/Down; mouse wheel; touch swipes (browse) and taps (open), plus drag-scroll inside the canvas sheet; Gamepad API (d-pad or stick, south button opens, east goes back). `prefers-reduced-motion` slows the wave to near-still and removes the wobble and ripples. It can also be toggled in Settings.

**Cost and mapping onto the real build.**
- One self-contained file: about 26 KB gzipped of HTML/CSS/JS, plus the inlined content and the no-JS index (46 KB total).
- Zero dependencies, apart from the M PLUS 1p Google Font.
- On the real site this would be one island on the homepage. The menu is static markup the SSG can emit, and each item links to a real route, so it works without JS. The canvas, shaders and HTML-in-Canvas texture hydrate after first paint. Article pages would stay ordinary SSR pages, with the glass view as progressive enhancement.
- Honest cost: a full-screen fragment shader on every frame, plus a mipmap pass for the blur. That is fine on any discrete or integrated GPU, but it is about 1 fps in SwiftShader. `requestAnimationFrame` already stops in hidden tabs, but the scene does not yet drop resolution on low-end phones.

**Files.**
- `index.src.html` is the source. `node build.mjs` inlines `../content.json` into `index.html`.
- `shots.mjs` regenerates the screenshots with a frozen-clock pose (`__tfix` / `__hold`) so that slow software GL still captures the intended frame.
- `record.mjs` renders `demo.mp4`: the page runs on a virtual clock (`performance.now`, `Date`, rAF, timers and every CSS animation stepped exactly 1/30 s per frame), frames are captured one by one and encoded with ffmpeg/libx264.
- `a11y-audit.mjs` (axe-core, injected only in the test) and `contrast.mjs` (contrast against the rendered background) are the accessibility checks below.

## Accessibility

What I verified, and how (Chromium 141 headless, both render paths):
- **axe-core 4.10.2**, injected only by `a11y-audit.mjs` and never shipped, across 10 states × 2 paths: all six sections, an open article, System Information, and mobile home and article. **Before:** 0 critical, 0 serious, 24 moderate (`region`, `heading-order`). **After:** 0 / 0 / 0. `color-contrast` stays "needs review" because axe cannot see through a WebGL background, so contrast is measured separately.
- **Contrast**, with `contrast.mjs`: freeze the clock, then screenshot with and without the text fill (halos kept). The pixels that change are glyph strokes. For every text run I take the 95th-percentile-worst background behind them. Coverage: all four palettes, two wave phases, menu, Settings, article on both paths, and mobile. That is 168 element groups, all at or above 4.5:1 (3:1 for large text).
  - Changes needed to get there:
    - deeper dawn, dusk and day gradient bottoms
    - a dark text halo under every menu label
    - darker glass in the shader and in CSS
    - dark-glass buttons
    - full-opacity list rows
  - Rows at the list's top and bottom edge used to half-fade (2.3–3.8:1). They now crossfade fully in or out, so no row ever sits at partial opacity.
- **DOM is the source of truth.**
  - Every menu entry is a real link or button inside `tablist`/`tab`/`tabpanel` with `aria-selected`, `aria-controls` and `aria-current`.
  - Settings rows are `role=button`.
  - The article is the same `role=dialog aria-modal` DOM in both paths. On the canvas path it is the canvas's drawable child; the `<section aria-label="Reader">` around the canvas is `aria-hidden` whenever no article is open.
  - Icons are `aria-hidden` SVG.
- **Landmarks and title:** `<header>`, `<main>` (one h1: a visually hidden "Max Leiter", or the article title while the dialog is open), `<nav aria-label="Sections">` and `<footer>`. Headings never skip a level. `document.title` follows the section and article. There is a skip link.
- **Focus:**
  - One ring style everywhere: a white ring with a dark halo and glow, visible on every palette.
  - Arrow keys and Tab agree, because tabs and rows use roving `tabindex`.
  - Opening an article focuses the dialog; Tab is trapped inside it plus Back.
  - Esc, the Back button or a click outside closes it, and focus returns to the row that opened it (all verified in Playwright).
  - While the dialog is open, the menu and header are `inert`.
- **Screen readers:** arrow and gamepad moves (the gamepad dispatches the same key path) are announced through a debounced `role=status` region, for example "Notes section. Updating JSONB fields with Drizzle. 3 of 8". The a11y tree was checked with Playwright snapshots.
- **Motion:**
  - With `prefers-reduced-motion`, or Motion set to Reduced in Settings, the wave drifts at 12% speed.
  - Ripple, scroll slosh, jelly, fly-in, chromatic fringe and the sheen are multiplied by zero in the shader and in CSS, and the panel simply crossfades in 0.2 s.
  - Even with full motion, the ripple is capped at 3.5 px so text never bends enough to hurt reading.
  - Nothing flashes: the sparkle twinkle is under 0.6 Hz and the sheen passes once every 8.75 s.
- **Sound:** muted by default. A labelled 44 px toggle button with `aria-pressed` turns it on, and nothing is conveyed by sound alone.
- **Input:**
  - Keyboard, mouse, touch (swipe and tap tested via CDP touch events) and gamepad (mocked pad).
  - Every control is at least 44 px.
  - Zoom is not disabled. At 200% (640×360 CSS px) a compact layout is used, with no horizontal scroll.
- **No JS:** `build.mjs` renders a static `<main>` index of every post, note, project and work link (54 links). It shows while `<html class="nojs">` is set; JS removes that class only after a successful boot, so a failed boot leaves the index visible. If WebGL fails, a CSS gradient replaces the scene.

Known gaps (honest):
- On the canvas path, find-in-page cannot see the article, and drag-selection is my `caretPositionFromPoint` shim. Reading mode is the escape hatch.
- On the legacy API, hit testing and accessibility geometry use the rectangle, not the rippled shape.
- `window.find` does not work in headless Chromium at all, so find-in-page in reading mode is verified structurally (it is ordinary rendered DOM), not by automation.
- I have no real screen reader or real gamepad here. Announcements were checked as live-region text, not heard in VoiceOver or NVDA.
- Contrast is measured on SwiftShader renders at two wave phases. A ribbon fold landing exactly under a word at another moment could dip briefly; the halo is what protects that case.
- On a zoomed desktop window the hints say "Swipe to browse", because the compact layout reuses the phone hints.
