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

**Known issues.** Headless software GL renders slowly: blur, reflection and 3D layers. Real GPUs are fine, but low-end devices should get a static fallback (no reflection or canvas). The reader is an excerpt plus a link out. Focus is not trapped inside the overlays (aria-modal only).

**Mapping onto the real build.** Blades and lists would be SSR'd HTML, since every item is already a real link. The dashboard would be one homepage island of about 10 KB brotli: spring, input and audio. The worker (~2 KB) would be lazy, fonts self-hosted, and content pages would keep the plain renderer with only the glass CSS skin. Honest cost: this breaks the "1 KB of JS per page" ethos on the homepage, and the always-on canvas plus five large composited layers cost GPU memory.
