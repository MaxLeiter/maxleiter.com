# blades — a mid-2000s blade dashboard

**Concept.** Five glossy, translucent, slightly curved blades filed like binder pages: projects (orange), blog (green, home), notes (blue), work (purple), system (silver). Blog doubles as home: a profile card (procedural SVG avatar), the post list, and a brushed-glass preview. Enter morphs that preview into a full-screen glass reader. Press `G` or the orb for the guide; a "New post" toast slides up on load.

**Tech.**
- Blade motion runs on a hand-written spring (semi-implicit Euler, 1/240 s substeps). Each frame it maps one float position onto every blade: translate, `perspective()` hinge swing, velocity overshoot, depth shade.
- The same spring is sampled into a CSS `linear()` easing for the View Transition (preview to reader) and the list transitions.
- Touch: an axis-locked pointer drag. Momentum is projected from the flick velocity and handed back to the spring with that velocity; the ends rubber-band.
- Ribbons and bokeh: drawn on an `OffscreenCanvas` in a Blob worker at half resolution. The same renderer source runs on the main thread as a fallback.
- `@property`: backdrop colours tween between blades, the orb's conic ring spins, and a sheen sweeps the selected item.
- WebAudio, all synthesized: band-passed noise swishes panned with direction, FM bells, and a convolution reverb from a generated impulse. Muted until toggled (button or `M`).
- Gamepad API: d-pad or stick moves between blades and items (with repeat), shoulders switch blades, south selects, east goes back, start opens the guide. Hints use a neutral four-dot glyph.
- Brushed-metal and noise textures are painted on a canvas at boot; all art is seeded-RNG SVG; `-webkit-box-reflect` provides the glossy floor.

**Real vs faked.** All titles, dates, descriptions and excerpts come from content.json. The reader renders the excerpt with a small Markdown subset; images become captions and JSX lines are dropped. Rep/Score/Zone are flavour; Score is derived from the content counts. Fonts are Open Sans from Google Fonts, with Segoe/Noto fallbacks.

**Support.** Chromium is the reference. Without View Transitions the reader just opens; without OffscreenCanvas the background draws on the main thread; without `@property` the gradients snap; box-reflect is Chromium/WebKit only. `prefers-reduced-motion` snaps the springs and freezes the canvas, sheen and orb; System → Motion toggles it in-app. Keys: arrows, Enter, Esc, 1-5, G, M, Home/End/PgUp/PgDn.

**Known issues.** With explicit SwiftShader GL flags, headless Chromium renders this page slowly enough that the View Transition times out ("timeout in DOM update"). Default headless and real GPUs are fine. Only the glass element takes part in the transition (the root opts out), which keeps the capture cheap. Low-end devices should still get a static fallback, with no reflection or canvas. The reader shows the excerpt plus a link out.

**Video.** `demo.mp4` was rendered offline by `tools/record.mjs`, at 30 fps on a virtual clock (`tools/vclock.js`). The recorder overrides `performance.now`, rAF and timers, freezes the document timeline over CDP, and seeks every Web Animation each frame. That includes the View Transition pseudo-elements. The motion is the real spring code, frame-exact. The video has no audio. Under the frozen timeline, Chromium CHECK-crashes if a View Transition's pseudo animations are `finish()`ed, so the recorder ends them with `skipTransition()` instead.

**Mapping onto the real build.** Blades and lists would be SSR'd HTML, since every item is already a real link. The dashboard would be one homepage island of about 10 KB brotli: spring, input and audio. The worker (~2 KB) would be lazy, fonts self-hosted, and content pages would keep the plain renderer with only the glass CSS skin. Honest cost: this breaks the "1 KB of JS per page" ethos on the homepage, and the always-on canvas plus five large composited layers cost GPU memory.

## Accessibility

**How it was verified.** Everything below was checked in Playwright Chromium; the scripts are in `tools/`.
- **axe-core 4.10.2:** injected in the test harness only, never shipped. `tools/audit.mjs` covers 10 states: home, projects, notes, work, system, reader open, guide open, toast showing, mobile, and mobile reader. A failed-boot fallback is checked separately.
  - Before: 4 violations, all moderate: missing h1 ×2, and the mobile tablist sitting outside a landmark ×2. No serious or critical violations.
  - After: 0 violations in every state, including the fallback.
- **Contrast (`tools/contrast.mjs`):** measured against the real rendered background, not CSS values. The script renders the page with all text made transparent, then samples every pixel under each text run, clipped to its overflow box. It scores the 5th-percentile (worst-case) pixel and does not credit text-shadows. Text needs 4.5:1; large and UI text needs 3:1.
  - Before: 118 of 370 runs failed, worst 1.12:1. White text sat on bright lime, sky and silver glass, and the toast covered the buttons.
  - After: 0 of 363 fail. The lowest is 3.04:1, on large text in the reader header; body text is at least 4.5:1.
  - The fix: blade body tones are deeper, the key light moved to the top-right away from the titles, the gloss is a thin rim, list rows use darker glass, and buttons and chips sit on the dark tone. The silver blade is now gunmetal.
- **Behaviour (`tools/a11y-checks.mjs`):** all checks pass.
  - The skip link is first in Tab order and moves focus to the active list.
  - Arrow selection and the focused listbox's `aria-activedescendant` always match.
  - Focus follows Left/Right into the new section.
  - Tab and Shift+Tab stay trapped inside the reader and the guide. Esc closes both and returns focus to the opener (the list, or the orb).
  - The sound switch toggles with Space or Enter without double-firing.
  - Arrows on the tablist move focus and selection together.
  - The toast is `role=status` and overlaps no control.
  - Mobile touch targets are at least 44px, with no horizontal scroll at 390px.
  - At 200% zoom (640×360 and 960×540) the list stays usable and there is no horizontal scroll.
  - With JS off, a fallback index of all 51 links is shown.
  - The gamepad was checked with a mocked `navigator.getGamepads`; it goes through the same key path, so it gets the same announcements.

**What's in place.**
- **Semantics and landmarks:** a skip link; `<header>`, `<nav>` (the section tablist), `<main>` and `<footer>` landmarks; one h1 per view (a hidden page h1, or the article h1 while the reader is open).
- **Widgets:** the blades are `tabpanel`s owned by a real `tablist`. The tablist is always visible on mobile; on desktop it appears when keyboard focus enters it. Lists are `listbox`/`option` with `aria-activedescendant`.
- **Title and announcements:** `document.title` changes per section and per article. A debounced, polite `aria-live` region announces arrow, gamepad and swipe moves, e.g. "notes section, 8 notes. Per-directory…, 1 of 8".
- **Overlays:** the reader and guide are `aria-modal` dialogs. The background is made `inert` while they are open, Tab is trapped, Esc closes, and focus returns to the opener. The orb has `aria-expanded`.
- **Toast:** it sits inside `role=status` and now lives in the hint bar beside the orb, so it never covers an action.
- **Focus ring:** black/white/black, legible on every surface.
- **Decorative content:** canvas, icons, stars (with a text equivalent), reflections and hint glyphs are `aria-hidden`.
- **Sound:** a labelled `role=switch` that is muted by default. Nothing is conveyed by sound alone.
- **Motion:** reduced motion, via the system setting or System → Motion, snaps the springs, freezes the canvas, sheen and orb, and uses fades instead of the swing and the morph. Nothing flashes.
- **Failure fallback:** with no JS, or if boot throws, `inline-content.mjs` provides a plain linked index of posts, notes, projects and work.

**Known remaining gaps.**
- **Not tested with real screen readers:** no NVDA, JAWS, VoiceOver or TalkBack. Only the DOM, ARIA and axe were checked.
- **Find-in-page:** it only reaches the active section and the open reader, because inactive sections are `inert`.
- **Zoom:** text-only zoom (Firefox/Safari) is untested, since sizes are px-based. Chrome page zoom at 200% works, but at 640×360 the list shows only about 3 rows.
- **Contrast figures:** they come from a reduced-motion frame. The animated ribbons sit behind mostly opaque glass, so they can shift the numbers only slightly.
- **Toast timing:** it auto-hides after about 5 s. The same item is in the blog list, so nothing is lost.
- **Mouse hover:** it changes the selection, matching the era's behaviour, but never moves focus.
