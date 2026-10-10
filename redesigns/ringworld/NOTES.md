# Ringworld: "MERIDIAN"

**Concept.** Max's site as the main menu of an invented 2007 sci-fi shooter called *Meridian*. A slow camera drifts in space above a ring-shaped megastructure that arcs over a banded gas giant in a binary star system. A thin, tracked, uppercase menu sits on the left with hairline brackets and a pulsing selection bar. Each section is a game mode:
- **Campaign**: blog posts as missions. Each has a procedurally painted thumbnail, a "difficulty" tier and an "intel" line, and opening one shows the excerpt as a readable briefing.
- **Theater**: notes as saved films. Each film has a scrubbable timeline that reveals the transcript as it plays.
- **Forge**: projects as an object palette with rotating wireframes.
- **Matchmaking**: Vercel posts as playlists. A fake search resolves into "Match found".
- **Service Record**: the About page, with stats, a posts-per-year chart and medals computed from `content.json`.
- **Settings**: sound, music and SFX volume, motion, render quality and an FPS counter.

**Tech.**
- WebGPU path:
  - The scene is one analytic fragment shader with no meshes. It does ray–cylinder intersection for the ring (inner terrain, hull, rim walls), a ray–sphere intersection for the planet, and an in-shader atmosphere (Rayleigh+Mie, 6–12 samples).
  - It also draws a planet shadow on the ring, the ring's shadow on the planet, night-side city lights, fbm stars and a nebula.
  - Particles are a compute pass: 1.5k–12k dust motes and debris in a camera-relative wrapped volume, orbiting the ring axis, drawn as one instanced premultiplied pass.
  - Post-processing runs in rgba16f HDR: 13-tap downsample / tent upsample bloom (4–6 levels), an analytic lens flare (ghosts, anamorphic streak, starburst, halo), ACES, split-tone, chromatic aberration, vignette and grain.
- WebGL2 path: the same shaders mirrored in GLSL ES 3.0. Particles are evaluated in closed form in the vertex stage because WebGL2 has no compute. Without `EXT_color_buffer_float` it falls back to LDR with inline tonemapping.
- Canvas2D path: a painted plate that drifts slowly.
- Dynamic resolution: an EMA of frame time scales the 3D buffer between per-quality min and max (0.3–1.0) with hysteresis. The composite always runs at full resolution.
- Audio (synthesized WebAudio, nothing sampled):
  - A choir pad: detuned saws through vowel formant banks that morph per chord. The progression is an original D-minor one with a sparse soprano line.
  - A generated 6 s convolution reverb.
  - UI blips and a sweep.
- All imagery is procedural: mission and film thumbnails, emblem, medals, wireframes. Fonts come from Google Fonts (Saira variable width, Michroma, Rajdhani, Exo 2). There are zero JS dependencies.

**Real vs faked.**
- Real, computed from the content: posts per year, streaks, gaps, medals, XP and rank.
- Faked:
  - "Difficulty / est. read time" is a seeded estimate, because `content.json` only carries 1200-char excerpts.
  - Matchmaking search, "open slots", and Forge budget and IDs are set dressing.
  - Film durations are derived from word count.
- No trademarks: mode names are plain words, difficulty tiers are original (Cadet/Regular/Veteran/Ironclad), and pad hints use neutral ①/② glyphs.

**Browser support / verification.**
- WebGPU was verified headless on Chromium 1194 with SwiftShader Vulkan (`--enable-unsafe-webgpu --enable-features=Vulkan,WebGPU --use-vulkan=swiftshader --use-webgpu-adapter=swiftshader --enable-unsafe-swiftshader`). The `--use-gl=angle` flag set loses the device ("Instance reference no longer exists"). WebGPU needs a secure context, so `http://localhost` or https.
- WebGL2 was verified headless (ANGLE/SwiftShader, `?renderer=webgl2`): the frame matches the WebGPU one apart from the particle integrator. Canvas2D (`?renderer=2d`) was verified too. I have not verified any path on real GPUs, Safari, Firefox or a physical gamepad.
- Headless SwiftShader is too slow to measure 60 fps. Frame rate is untested on real hardware.

**Video.** `demo.mp4` (14.5 s, 1280×720 H.264, 3 MB) was rendered deterministically: a capture-only init script replaces `performance.now`, rAF, timers and every CSS animation's `currentTime` with a virtual clock stepped at 30 fps, frames screenshotted from real WebGPU output and encoded with ffmpeg (nothing time-related in the shipped page was changed).

**Mapping onto the real site.**
- Content becomes static HTML routes: `/`, `#campaign`, and so on, which become real `/blog`, `/notes`, `/projects` pages. Each would ship the same DOM, which is already semantic.
- The menu shell is small: a CSS-only selection bar plus about 6 KB of navigation JS, so it fits as one `load` island.
- The renderer (~45 KB of shader source and ~18 KB of JS, minified/brotli likely ~20 KB) and the audio would be a lazily imported, opt-in island. It is far over the site's 1.5 KB runtime budget, so it must never ship in the inlined runtime.
- `shot-*`/thumbnail art is generated client-side, so it costs nothing in assets.
- Honest cost: a continuously running full-screen ray-marched shader is a battery tax. The real site would need to pause it when the tab is hidden or idle and default to "Low" on mobile.
- Dev overrides: `?renderer=`, `?q=`, `?scale=`, `?nostart`, `?cam=&tgt=&pose=`. Build with `node build.mjs` (inlines `src/*` and `content.json`).

## Accessibility

Verified with Playwright and Chromium 1194. The scripts live in the scratchpad, not shipped.

**axe-core 4.10.2.** It was injected in Playwright only. `cdn.jsdelivr.net` is blocked by this sandbox's egress policy, so the same pinned build was loaded from the npm tarball. It ran in 13 states: title, main, campaign, mission (article open), theater, film player, forge, matchmaking with the search overlay resolved, service record, settings, and mobile main, mission and campaign.
- **Before:** 0 critical, 2 serious, 14 moderate.
  - Serious: `scrollable-region-focusable` on the film transcript and the Forge properties pane.
  - Moderate: `landmark-no-duplicate-main`, ×12. The title `<main>` had `[hidden]` overridden by `display:flex`.
  - Moderate: `landmark-complementary-is-top-level`, ×2.
- **After:** 0 / 0 / 0 in every state.

**Contrast against the real background.** axe can't see through a WebGPU canvas, so I wrote my own check. It renders the real frame twice, once normally and once with all text set transparent. For every visible text run, it takes the brightest 3% of background pixels in that run's box and computes the WCAG ratio against the text colour, alpha-blended.
- Before the fixes, it failed in these places:
  - The title subtitle, 1.62:1 over the lit ring band.
  - "Press Start", 3.35:1 at the bottom of its breathing animation.
  - List rows, 3.1:1 where the planet showed through the glass.
- Fixes:
  - Dark plates and a radial scrim behind the title text.
  - "Press Start" now breathes between 100% and 72% instead of 38%.
  - Panels went from 0.7 to 0.93 opacity, with blur.
  - A stronger left, top and bottom scrim.
  - Solid `--ink-dim` and `--ink-faint` tokens instead of alpha.
- After the fixes, minimum ratios (UI / body):

  | State | UI | Body |
  |---|---|---|
  | Title | 8.5 | – |
  | Main | 5.9 | 9.4 |
  | Campaign | 3.8 | 6.8 |
  | Mission | 4.3 | 11.9 |
  | Theater | 4.0 | 8.5 |
  | Matchmaking | 4.6 | 13.8 |
  | Service | 4.6 | 8.6 |
  | Settings | 7.0 | 15.4 |

  Body text is at least 4.5:1 everywhere, and UI labels are at least 3:1. Film and Forge could not be measured over WebGPU, because headless screenshots stall while their 2D canvases animate. They use the same panel tokens.

**Structure.**
- Every screen is real DOM: links, buttons, lists, a table and headings. There is one `<h1>` per view. Panel headers are `<h2>`. `<nav>` wraps the main menu, and the active screen is `<main>`.
- Canvases are `aria-hidden`. Mission thumbnails, wireframes and film frames are decorative duplicates of text that is present.
- `document.title` updates per screen and per article.
- A skip link goes to content.
- A debounced polite `aria-live` region announces screen and item changes from arrows and gamepad.
- The film transcript is exposed in full to AT. The partially revealed visual copy is `aria-hidden`.

**Focus.**
- Arrow selection *is* DOM focus, so the two agree:
  - Tab, mouse hover and arrows all move the same `.sel`.
  - Inline article links are part of the arrow set.
  - Enter on a Tab-focused control keeps its native behaviour.
- The focus ring is a 2px #eaf8ff outline plus a blue halo on the selection bar, or on the element itself.
- Esc and Back return focus to the opener. For example, mission → campaign lands on that mission's row; this was verified with keyboard and with a simulated gamepad.

**Overlays.** There are no modal dialogs. The article reader and film player are routes (`#mission/…`, `#film/…`), and the matchmaking search is in-panel and cancellable with Esc.

**Motion.**
- `prefers-reduced-motion` is honoured, and there is an in-UI Motion toggle in Settings. In reduced mode:
  - No camera drift or sway.
  - Camera moves become cuts.
  - Particles and ring spin slow to 12%.
  - Hologram enter and scan sweeps become 0.2 s crossfades.
  - CSS loops stop.
  - The film opens fully revealed and paused.
- The hologram flicker is a single dip, so nothing flashes more than about 2× per second.

**Sound.** Off by default. A labelled `aria-pressed` toggle on the title and top bar, plus M or gamepad ④. Nothing is conveyed by sound alone.

**Input.**
- Keyboard: arrows/WASD, Enter/Space, Esc/Backspace, PgUp/PgDn, Home/End.
- Mouse: hover selects, click opens.
- Touch: tap.
- Gamepad: D-pad/stick with key-repeat, ①/② for select and back, LB/RB to page. This was verified by stubbing `navigator.getGamepads`.
- At 390px and 200% zoom (640×360 CSS px) there is no horizontal scroll and every control is at least 44px. Zoom is not disabled.

**No-JS.** `build.mjs` emits a `<noscript>` index of every post, note and project with working links. If WebGPU fails, the app falls back to WebGL2 and then to Canvas2D. The UI is DOM either way.

**Known gaps.**
- Inactive screens are `display:none`, so find-in-page only searches the current screen.
- I have not tested with a real screen reader; only the axe and AT-tree checks were done.
- The film's not-yet-played text is drawn at about 30% opacity by design. The full text is available to AT, and it is shown immediately in reduced-motion mode.
- The SVG chart labels were checked by hand, not by the script.
- The 3D background is not described beyond being decorative.

