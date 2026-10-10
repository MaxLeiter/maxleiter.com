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
- WebGL2 compiles and links in headless ANGLE/SwiftShader, and the `?renderer=webgl2` and `?renderer=2d` paths render. I have not verified either on real GPUs, Safari or Firefox.
- Headless SwiftShader is too slow to measure 60 fps. Frame rate is untested on real hardware.

**Mapping onto the real site.**
- Content becomes static HTML routes: `/`, `#campaign`, and so on, which become real `/blog`, `/notes`, `/projects` pages. Each would ship the same DOM, which is already semantic.
- The menu shell is small: a CSS-only selection bar plus about 6 KB of navigation JS, so it fits as one `load` island.
- The renderer (~45 KB of shader source and ~18 KB of JS, minified/brotli likely ~20 KB) and the audio would be a lazily imported, opt-in island. It is far over the site's 1.5 KB runtime budget, so it must never ship in the inlined runtime.
- `shot-*`/thumbnail art is generated client-side, so it costs nothing in assets.
- Honest cost: a continuously running full-screen ray-marched shader is a battery tax. The real site would need to pause it when the tab is hidden or idle and default to "Low" on mobile.
- Dev overrides: `?renderer=`, `?q=`, `?scale=`, `?nostart`, `?cam=&tgt=&pose=`. Build with `node build.mjs` (inlines `src/*` and `content.json`).

## Accessibility

<!--A11Y-->
