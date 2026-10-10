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
- **Not working:** find-in-page does not see canvas children in this build.
- **Hit-test caveat:** hit testing uses the un-rippled rectangle, so while a ripple is running the visuals and the click targets can disagree by a few pixels.

**Fallback.** Without the flag, the same WebGL2 wave and depth of field still run, and the article is a normal DOM panel over the canvas:
- `backdrop-filter` glass, a CSS gloss and a sweeping sheen
- a keyframed jelly entrance that grows out of the item
- native scrolling that drives a `skewY` plus an SVG `feDisplacementMap` ripple

With no WebGL2 at all (`?mode=nogl`), a CSS gradient replaces the scene. `?mode=dom` forces the fallback in a flagged browser. The badge in the corner shows which path is active.

**Input.** Arrows, Enter, Esc, Home/End and PageUp/Down; mouse wheel; touch swipes (browse) and taps (open), plus drag-scroll inside the canvas sheet; Gamepad API (d-pad or stick, south button opens, east goes back). `prefers-reduced-motion` slows the wave to near-still and removes the wobble and ripples. It can also be toggled in Settings.

**Cost and mapping onto the real build.**
- One self-contained file: about 24 KB gzipped of HTML/CSS/JS, plus the inlined content (41 KB total).
- Zero dependencies, apart from the M PLUS 1p Google Font.
- On the real site this would be one island on the homepage. The menu is static markup the SSG can emit, and each item links to a real route, so it works without JS. The canvas, shaders and HTML-in-Canvas texture hydrate after first paint. Article pages would stay ordinary SSR pages, with the glass view as progressive enhancement.
- Honest cost: a full-screen fragment shader on every frame, plus a mipmap pass for the blur. That is fine on any discrete or integrated GPU, but it is about 1 fps in SwiftShader. `requestAnimationFrame` already stops in hidden tabs, but the scene does not yet drop resolution on low-end phones.

**Files.**
- `index.src.html` is the source. `node build.mjs` inlines `../content.json` into `index.html`.
- `shots.mjs` regenerates the screenshots with a frozen-clock pose (`__tfix` / `__hold`) so that slow software GL still captures the intended frame.
