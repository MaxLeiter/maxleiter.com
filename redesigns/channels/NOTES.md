# Channels

**Concept.** A late-2000s "new experience" console dashboard. Six channels (Home, Blog, Notes,
Projects, Work, About) stack vertically on the left. Each channel is a row of thick, glossy 3D
tiles: the focused tile is large and front-on, and the rest fan back into a charcoal room with a
mirror-polished floor under a dusty spotlight. Changing channel slides the row through depth with
motion blur, and a chromatic sheen runs across a tile when it gains focus. A procedural avatar
stands in the gap, waves, turns its head toward the tile and points at it. Opening a tile zooms the
camera in, the tile flips over, and its back face becomes a glass reader panel with the real excerpt.

**Tech (zero dependencies, one file, about 1,600 lines).**
- Raw WebGL2. 4x MSAA HDR target (RGBA16F) with an MRT per-object velocity buffer (RG16F, from current and previous MVP).
- Planar floor reflection: a mirrored half-res pass stores each pixel's height above the floor in alpha. The floor picks a mip level from that, so contact areas stay sharp and taller objects blur (cheap glossy roughness).
- Volumetric spotlight: 14-step raymarch in the composite, clipped by the resolved depth texture, with interleaved-gradient dithering. Two-level separable Gaussian bloom, ACES tone mapping, vignette, dither.
- Velocity-buffer motion blur, scaled by shutter/dt so it is frame-rate independent.
- Tiles are rounded slabs with real thickness and GGX clearcoat over a procedural softbox environment. The focus sweep is three offset Gaussian bands (R, G, B).
- Covers come from 9 seeded Canvas2D generators (low-poly shards, ringed planet, light ribbons, sports stripes, synth horizon, iso blocks, halftone sunburst, contours, panels), plus big type and a label band. They are uploaded as sRGB textures with mipmaps and anisotropy, generated lazily and kept in an LRU.
- Avatar: 37 smooth-shaded lathe-mesh parts on a 17-bone hierarchy, with blink, breathing, look-at, wave, point and hop. Camera and avatar both run on spring rigs.
- WebAudio sounds are synthesized: tick, bump, whoosh, open, close, plus a chord when you switch sound on. Muted until you opt in.
- Input: keyboard, wheel, drag-to-scrub with flick, tap, and the Gamepad API (stick or d-pad, shoulder buttons, face buttons, right stick scrolls the reader).

**Real vs faked.** The reflection is real geometry (mirrored rendering), but its blur is a mip
approximation. Tile shadows are analytic blobs, not shadow maps. The volumetric light does not
take shadows. The reader text is DOM laid over the flipped tile's back face (the canvas draws a
matching glass panel), not text rendered in WebGL.

**Support and fallbacks.** WebGL2 is required for the full scene. Without it, or with `?css`, a
CSS 3D-transform renderer draws the same rows, springs and covers, with `-webkit-box-reflect`
reflections and no avatar. Without `EXT_color_buffer_float` it drops to LDR and skips the velocity
MRT. On mobile the camera reframes for portrait, tiles get larger, the avatar stands beside the
caption, and swipe or tap work. If JS is off or boot throws, the page shows a plain list of every
link (rendered at build time by `inject.mjs`).

**Mapping to the real site, and the cost.** This would be one `load` island on the homepage only.
Every other route stays a static page. The accessible `<main>` list is exactly what the SSG already
renders, so the island just hydrates over it. The cost: this file is about 181 KB raw and about
61 KB gzipped. That includes about 46 KB of embedded content JSON, which the real build would
instead pass as island props trimmed to title, date and a short excerpt. The script alone is about
108 KB raw, roughly 30 KB brotli. That is about twice the current desktop island and far over the
runtime's 1.5 KB budget, so it must never ride in the inlined runtime. GPU memory is about 50 MB
of cover textures at most. It must also lazy-mount behind first paint, and it needs a real GPU:
SwiftShader renders it at about 0.4 fps.

`demo.mp4` was recorded deterministically. `?capture` exposes `__ch.step(dt)`, which renders one
frame and GPU-syncs. Playwright stepped 1/30 s per frame (435 frames) and ffmpeg/libx264 encoded
them. The screenshots and video use the system fallback font: Google Fonts (Open Sans) is blocked
in the sandbox.

## Accessibility

The canvas is `aria-hidden`. Everything it draws also exists as real DOM, and that DOM is the
source of truth.

**What exists.**
- A Skip link, then `<header>` with the Motion and Sound toggles (labelled buttons with `aria-pressed`).
- `<nav aria-label="Channels">`: the visible channel names are real `<button>`s, and `aria-current` marks the live one.
- `<main>`: one `h1` (the site name), then an `h2` per channel and a `<ul>` of real links to every post, note and project, in scene order.
- The reader is `role="dialog"` with `aria-modal`, named by its `h2`. While it is open the background is `inert` and focus is trapped. Esc closes it and focus returns to the opener.
- `document.title` follows the channel or article.
- A debounced polite `aria-live` region announces channel changes, and item changes that did not move DOM focus (gamepad or wheel). `role="status"` carries the controller and toggle toasts.

**Focus.** Arrow keys and the gamepad move DOM focus onto the item's link, and Tab or Shift-Tab
through the links moves the 3D scene. The two are always in agreement. A white, black and accent
ring is drawn around the focused tile, and every control has a 3px white `:focus-visible` outline
with a dark halo.

**axe-core 4.10.2 audit** (injected in Playwright only, from the npm tarball because the sandbox
blocks jsdelivr). It ran in 10 states: home, blog, notes, projects, work, about, article open,
mobile, mobile with the reader open, and no-JS. The no-JS run used a script-stripped copy with the
failure-path class set.
- First run: 15 violations. That was 7 serious `aria-dialog-name`, 7 minor `empty-heading` and 1 moderate `heading-order`. The closed reader's `display:flex` beat `[hidden]`, which exposed an empty, unnamed dialog. Excerpt `###` headings jumped from h2 to h4. In that first run the no-JS state never executed, so it was not covered.
- Final run: **0 violations in all 10 states**, with no critical, serious, moderate or minor findings.
- That first run came after the a11y restructure. The pre-restructure build was never audited.

**Contrast.** axe marks text over the WebGL canvas as "incomplete", so I measured it myself. For
every text run (via Range client rects), I hid the glyphs and rendered the real frame. I then
computed the WCAG ratio per pixel against the alpha-blended text colour and kept the worst case,
across 7 state and viewport combinations.

This found real failures:
- Caption: 2.1:1 over bright floor reflections.
- Key legend: 2.5:1.
- Item counter: 2.0:1.
- Faded channel labels: 2.5:1.

The fix was era-style frosted info panes behind the caption, counter and legend, plus brighter
secondary text. Final worst cases:

| Text | Worst-case ratio |
|---|---|
| Body text | 4.77 or better (caption kicker; description 5.19, reader prose 6.30) |
| UI and large text | 3.80 or better (non-current channel labels) |

**Motion.**
- `prefers-reduced-motion`, or the in-UI Motion toggle (saved in localStorage), freezes shader time (ribbons, dust, haze), the glow pulse, avatar sway, waves, gestures, camera drift and parallax.
- In that mode motion blur and the tile flip are off, and springs become critically damped. The reader then crossfades.
- The focus sheen is rate-limited to one every 0.4 s, so nothing flashes more than 3 times a second.

**Sound** starts muted, has a labelled toggle reachable by keyboard (or `M`), and is never the only
cue for anything.

**Input.** A Playwright suite (19/19 pass) covers:
- The Skip link.
- Arrow keys moving DOM focus, and focus following on channel change.
- Tab moving the scene.
- Enter opening the reader and putting focus in the dialog, `inert` on the background, the Tab trap, and Esc returning focus.
- Both toggles from the keyboard.
- No zoom lock.
- Every visible target at least 44px, including the scaled channel labels, which get an inverse-scaled hit box.
- A stubbed gamepad d-pad.

Touch uses swipe, tap and pinch-zoom (`touch-action: pinch-zoom`). At 200% zoom (640x360 CSS px)
nothing scrolls horizontally, the reader scrolls internally, and the labels and legend shrink or
hide on short viewports.

**No-JS / failure.** `inject.mjs` renders a static list of every post, note, project and link into
`<main>`. A `<noscript>` style, or an `error` before boot completes, turns it into a readable page.

**Known gaps (honest).**
- Find-in-page can match the visually hidden link list but cannot show the hit. Only the open reader is visibly findable.
- The cover art text is canvas-only. It is mirrored by link text, but you cannot select it.
- No real screen-reader session (NVDA or VoiceOver) was run. Everything here is axe plus DOM and behavior assertions.
- The gamepad was tested with a stubbed `navigator.getGamepads`, not real hardware.
- Contrast was sampled in 7 states, not every item or animation frame. Mid-sweep frames are brighter for about 1 s.
- The CSS fallback has no avatar, and its reflections need `-webkit-box-reflect`, which Firefox lacks.
