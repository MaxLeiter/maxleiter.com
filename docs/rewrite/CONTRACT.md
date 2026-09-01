# Rewrite contract

Binding conventions for every agent working on the `bespoke-framework` branch.
Design rationale lives in `04-architecture-design.md`; feature requirements in
`01-feature-inventory.md` §9; Vercel facts in `03-vercel-build-output-research.md`.
This file is the interface spec. If you need to deviate, update this file in the
same change and say so in your report.

## Ground rules

- Work ONLY in `/Users/max/Documents/maxleiter.com-bespoke` (git worktree, branch
  `bespoke-framework`). Never touch `/Users/max/Documents/maxleiter.com`.
- Do not commit. The coordinator commits at phase gates.
- Style: TypeScript strict, no `any`, no semicolons, single quotes, 2-space indent,
  80 cols. Run `pnpm lint` (oxlint + oxfmt) before reporting.
- Package manager: `/Users/max/Library/pnpm/pnpm` (the `pnpm` on PATH is a broken
  corepack shim). Everything the design needs is already installed; avoid adding
  deps. If you must, run a single `pnpm add`, never several in parallel.
- Runtime: `bun` runs scripts locally (`bun run build.ts`). Code must ALSO work
  under Node 24: no `Bun.*` APIs outside `framework/dev.ts`. All module resolution,
  path aliases, CSS-module and MDX imports are handled by esbuild (see Pipeline),
  never by runtime loaders, so node and bun behave identically.
- Path alias `@*` -> `./app/*` stays (tsconfig `paths`). esbuild reads tsconfig.
- **Cutover is done. `next` is removed** — uninstalled, and the whole Next app
  (`app/(subpages)/`, `app/layout.tsx`, `app/api/`, the metadata routes) is
  deleted along with every component only it reached. `bun run build.ts` /
  `node scripts/build.mjs` is the only build. Nothing imports `next/*`; the
  esbuild shims for those specifiers are gone. `docs/rewrite/baseline/` is the
  committed record of the old output, so the gate needs no Next install.
  Anything under `app/` unreachable from `framework/entry-server.ts`,
  `framework/routes.ts`, `app/pages/**` or `app/islands/**` is dead and should be
  deleted, not left in place.

## Directory layout

```
build.ts                         orchestrator (core agent owns this)
framework/
  types.ts                       shared types below (core agent owns; others import)
  content.ts                     posts/notes/projects loading -> BuildContext
  mdx.ts                         @mdx-js/mdx compile + run, content-hash cache in .cache/
  highlight.ts                   shiki dual-theme rehype/remark integration
  render.ts                      renderPage(): html shell, <head>, inline CSS, island scripts
  islands.tsx                    <Island> build-time component + manifest
  css.ts                         tailwind cli + lightningcss css modules -> one sheet
  client.ts                      esbuild island/runtime bundles -> /_assets
  routes.ts                      page registry: every route -> PageDef
  routing.ts                     URL -> file: redirects, ?embed rewrite, MIME. One table,
                                 read by vercel.ts, dev.ts and tools/snapshot.ts
  node-bundle.json               the node/ESM esbuild options build.ts and
                                 scripts/build.mjs both bundle with
  transitions.ts                 transitionName(kind, slug) and its URL inverse
  platform.ts                    runPlatformSteps(ctx) (platform agent owns; see below)
  og.ts feeds.ts vercel.ts images.tsx fonts.ts   (platform agent owns)
  dev.ts                         watch + static server + live reload
  client/runtime.ts              the ~1KB vanilla runtime (islands, theme, cmd-k,
                                 delegated analytics, view-transition names)
app/islands/<name>.tsx           client island components (default export)
app/pages/*.tsx                  page components (plain React, no Next imports)
tools/snapshot.ts tools/diff-html.ts   (harness agent owns)
docs/rewrite/baseline/           normalized snapshots of the Next output
.cache/                          gitignored build cache
.vercel/output/                  build product (gitignored)
```

## Shared types (`framework/types.ts`)

```ts
export type Post = /* existing app/lib/types.d.ts Post */
export type Note = /* existing */
export type Project = /* existing app/lib/portfolio-data shape */

export interface BuildContext {
  root: string                 // repo root (absolute)
  outDir: string               // `${root}/.vercel/output`
  staticDir: string            // `${outDir}/static`
  posts: Post[]                // published only, date desc, WITH body
  notes: Note[]                // published only, date desc, WITH body
  projects: Project[]
  site: { url: 'https://maxleiter.com'; title: 'Max Leiter'; author: 'Max Leiter' }
  assets: AssetManifest        // logical name -> hashed public URL, e.g. 'runtime.js' -> '/_assets/runtime.3f9a.js'
}

export interface Head {
  title?: string               // rendered as `${title} | Max Leiter`, or 'Max Leiter' if absent
  description: string
  canonical: string            // absolute URL
  ogImage?: string             // absolute URL to PNG; default site OG
  ogType?: 'website' | 'article'
  publishedTime?: string       // ISO, articles only
  noindex?: boolean
}

export interface PageDef {
  path: string                 // URL path, leading slash, no trailing slash, e.g. '/blog/weights'
  head: Head
  render: () => Promise<React.ReactElement> | React.ReactElement
  variants?: { embed?: boolean } // when embed, ALSO emit `${path}/embed/index.html` with toolbar={false}
}
```

`Post.date`/`Note.date` stay the human strings in frontmatter; expose
`dateISO` on both when loading (used by feed, sitemap, OG, `<time datetime>`).

## Output conventions

- Directory output, never extensionless files: `/blog/weights` ->
  `static/blog/weights/index.html`. Root -> `static/index.html`. 404 ->
  `static/404/index.html` (referenced by routes as `dest: '/404'`).
  `staticPathFor()` in `framework/routing.ts` is the single implementation of
  that mapping; the write loop, the dev server and the harness all call it.
- A page needing its markup under a second filename declares `aliases` on its
  `PageDef`, and the write loop stays generic. `/404` declares `/404.html`,
  because Vercel's static builder injects an error-phase route to that name
  ahead of ours. Aliases land in the route manifest, so the harness sees them.
- Route manifest: the build writes `.vercel/output/routes.json` (beside
  `static/`, so it is never served) listing every emitted document as
  `{path, kind, title?, noindex, variants?, variantOf?, aliases?}` in registry
  order, with no timestamp. It is the single record of what the build produced:
  the sitemap's top-level pages are derived from it, and the harness reads it
  rather than keeping its own transcription of the page registry.
- Embed variant: `static/blog/<slug>/embed/index.html` and
  `static/notes/<slug>/embed/index.html`. Homepage iframes point at
  `/blog/<slug>/embed`. A `has: query embed` rewrite keeps old `?embed=true` links working.
  An embed's canonical URL is the page it varies, and it is always `noindex`.
- Redirects, the `?embed` rewrite and the `_assets` no-store guard are declared
  once in `framework/routing.ts`. `vercel.ts` turns them into config.json
  routes, `dev.ts` and `tools/snapshot.ts --dir` interpret them, so the three
  cannot drift. The `?embed` rewrite applies to `/blog/` and `/notes/` only.
- Hashed assets under `static/_assets/<name>.<8-char-hash>.<ext>`, immutable.
- Unhashed root files: `search-index.json`, `feed.xml`, `sitemap.xml`,
  `robots.txt`, `opengraph-image.png`, `blog/<slug>/opengraph-image.png`.
- `public/**` copied verbatim into `static/` (KnightOS emulator, favicons, mc images,
  Search Console verification file). `public/feed.xml` is NOT copied; feeds.ts writes it.
- CSS: one base sheet inlined into `<head>` of every page, plus the conditional
  fragments that page needs. **Every `*.module.css` is its own fragment, keyed
  by the scoped class names lightningcss returns for it.** There is no list of
  which modules count as features: adding a module gates it automatically.
  `build.ts` checks that every rule in a module is anchored to one of that
  module's own class names; a module with a bare `:root` or element selector
  cannot be gated safely, so it goes into the base sheet and the build says so.
  The three fragments that are plain sheets rather than modules (`mdx-diff.css`,
  react-tweet's `theme.css`, shiki's generated rules) declare their markers in
  one table in `build.ts`. Those markers are attribute-shaped
  (`class="shiki`, not `shiki`) because a bare word matches prose.
- Theme: server renders `<html data-theme="dark" style="color-scheme:dark">`; a
  ~230B blocking inline script in `<head>` corrects from `localStorage.theme`
  or `prefers-color-scheme` before first paint. `[data-theme='light']` is the
  light selector everywhere (existing CSS already uses it).
- Fonts: Geist Sans + Geist Mono variable woff2 (subset, see platform) served from
  `/_assets/`, preloaded, declared via hand-written `@font-face`, exposed as
  `--font-geist-sans` / `--font-geist-mono` so existing tokens keep working.

## Pipeline shape (core agent)

1. `content.ts` builds `BuildContext` (gray-matter, published filter, sort).
2. Server bundle: esbuild bundles `framework/entry-server.tsx` (which imports
   `routes.ts` and all pages) to `.cache/server/entry.mjs`, platform node,
   `packages: 'external'`, `format: 'esm'`, with plugins for `*.module.css`
   (lightningcss `cssModules`, collect CSS, export class map) and `*.mdx`
   (`@mdx-js/esbuild` OR manual `compile()` with the plugin stack below).
   Then `await import()` it and call `getPages(ctx)`. This is what makes path
   aliases, CSS modules and MDX work identically in bun and node.
3. MDX plugin stack (must match today): remark-frontmatter, remark-gfm,
   @fec/remark-a11y-emoji, remark-toc `{tight:true,maxDepth:5}`; rehype-slug,
   rehype-autolink-headings; plus shiki dual-theme highlighting of `pre > code`
   with `themes: { light: 'material-theme-palenight', dark: 'solarized-dark' }`,
   `defaultColor: false`, `cssVariablePrefix: '--s-'`, `transformerStyleToClass`.
   Keep the existing MDX component map semantics from `app/mdx/components/index.tsx`
   (a, pre, img w/ `?w=`/`?h=` parsing, Image, Details, Note, HomeIcon, Diff,
   FileTree/File/Folder, Tweet, MinecraftInventory, ShotGrid/Shot).
4. `render.ts` wraps each page in the HTML shell with `<head>` from `Head`,
   inline CSS, theme script, `<script type="module" src={assets['runtime.js']}>`,
   and island bootstrap data. `renderToStaticMarkup` from `react-dom/server`.
5. `css.ts`: `@tailwindcss/cli` on `app/styles/global.css` scanning `app/` +
   `framework/`, plus collected CSS-module output, plus shiki base rules, minified.
6. `client.ts`: esbuild, `format: 'esm'`, `splitting: true`, minify, alias
   `react`/`react-dom`/`react-dom/client` -> `preact/compat`(+`/client`),
   `jsxImportSource: 'preact'`, entry per island in the manifest +
   `framework/client/runtime.ts`. Output `/_assets/`, fills `ctx.assets`.
7. `platform.ts` -> `runPlatformSteps(ctx, { fonts, routes, renderPostHtml })`
   (OG, feeds, sitemap, robots, search-index, config.json), imported statically
   like every other framework module. Its three steps write disjoint files and
   run under one `Promise.all`. **Fonts are prepared once, by `build.ts`,**
   because the page shell needs their CSS before any page is written; the
   result is passed in so the platform log line can report it. Preparing them
   in both places re-read, re-hashed and rewrote both woff2 files every build.
8. Copy `public/`. Write `.vercel/output/config.json` (platform) and
   `.vercel/output/routes.json` (the route manifest, from `renderAll`'s result).

Steps that do not depend on each other overlap: the Tailwind CLI child process
runs while pages render, and the platform steps run while `public/` is copied.
The timing table says so, because per-step numbers then no longer sum to the
total.

package.json scripts, post-cutover: `dev` (`bun run framework/dev.ts`), `build`
(`node scripts/build.mjs`, what Vercel runs), `build:bun` (`bun run build.ts`),
`check` (`tsc --noEmit`), `lint` (oxlint + oxfmt), `snapshot`, `verify`, `gate`.

## Islands (core agent defines; islands/desktop agents consume)

```tsx
<Island name="palette" on="interaction" props={{ items }}>
  {/* server-rendered fallback / initial markup, REQUIRED so no-JS works */}
</Island>
```
- Emits `<div data-island="palette" data-on="interaction" data-props="{...json}">children</div>`.
- `on`: `'load' | 'idle' | 'visible' | 'interaction'`; default `'idle'`.
- Island component file: `app/islands/<name>.tsx`, `export default function`.
  Receives `props` parsed from `data-props`. Must render identical markup to the
  fallback on first render (it hydrates over it).
- Runtime hydrates with `hydrateRoot` from `preact/compat/client`, NOT `hydrate`:
  that module exports only `createRoot` and `hydrateRoot`, and `hydrate` lives on
  `preact/compat`. `client.ts` generates one wrapper entry per island that owns
  the call, which is what keeps preact out of the runtime.
- The runtime imports `/_assets/island.<name>.<hash>.js` lazily. Each page gets
  only its OWN islands in `<script type="application/json" id="__islands">`, not
  the site-wide union; `client.ts` still bundles the union.
- **Islands take class names as props, never by importing a CSS module.** The
  client esbuild config deliberately has no `*.module.css` plugin, so an island
  importing one fails loudly rather than shipping a second copy of rules already
  in the page's inlined sheet. The server resolves the class map and passes it
  through `data-props`. If that plugin is ever added, keep this rule.
- Per-page CSS gating reads the rendered HTML for a fragment's scoped class
  names, **including the `data-props` JSON**. That is load-bearing: a class an
  island mints at runtime (the shot grid's `trigger`) appears in props and never
  in server markup, so narrowing detection to rendered markup would silently drop
  its rules.
- `on="visible"` uses ONE shared `IntersectionObserver` at `rootMargin: 200px`
  for every such island on the page, and it always observes the island element
  itself. A zero-area island is fine: the spec sets `isIntersecting` when
  target and root overlap or are merely edge-adjacent, "even if the
  intersection has zero area", which was verified in Chrome against the built
  output. There used to be a fallback that observed `el.parentElement` when the
  rect had zero width or height; its only real effect was turning `visible`
  into `load` for the shot grid, whose island is a fragment sibling of the grid
  and whose parent therefore spans the whole article. It is gone.
  A real fallback is still preferred, because that is what makes the page work
  with JavaScript off. An EMPTY fallback is correct only where the island adds
  a control surface rather than reproducing markup — the shot grid renders just
  a `<dialog>`, and it is a SIBLING of the server-rendered grid on purpose: an
  island wrapping that grid would have to reproduce the image optimizer's
  `<img>` markup exactly or preact would destroy it on hydration.
  The runtime also registers the `interaction` listeners on `visible` islands,
  so an island the observer never reports still mounts when someone touches it.
  That path is only reachable for an island whose fallback has area.
- The runtime also handles, without any island: `[data-theme-toggle]` clicks,
  Cmd/Ctrl+K -> unhide `[data-island="palette"]` and mount it, `[data-track]`
  delegated analytics calls, and outgoing view-transition names. For
  `[data-track]`, `data-track` is the event NAME and every other data attribute
  becomes a payload key, camelCased by the dataset API: write `data-section`,
  not `data-track-section`. `data-vt-name` is the one attribute excluded from
  that payload, because it is the transition opt-in below.
- The menubar clock is NOT the runtime's. `#menubar-clock` exists only on the
  homepage, where the desktop island hydrates over it and owns it; a second
  interval writing `textContent` behind preact's back is one owner too many.
- View-transition names have a single owner: the runtime's `pageswap` handler.
  Elements opt in declaratively with `data-vt-name`, it names at most one of
  them, it stands down when something already holds that name as a live inline
  style (which is how an open post window wins over the card behind it), and it
  clears only the element it named itself. Two elements holding one name cancels
  the transition outright, so this cannot be two listeners racing on
  registration order. The name itself comes from `transitionName(kind, slug)` in
  `framework/transitions.ts` — never spelled out at a call site.

### Same-document router (`framework/client/router.ts`)

- **Capability detection only, never user-agent sniffing.** No `navigator.userAgent`,
  `navigator.platform`, `navigator.vendor` or brand string appears anywhere in
  `framework/` or `app/`. Every branch asks whether the API exists:
  `HTMLScriptElement.supports('speculationrules')`, `'PageRevealEvent' in window`,
  `typeof document.startViewTransition`, `navigator.connection`,
  `window.requestIdleCallback`. A browser that ships a feature tomorrow takes
  the better path with no code change, and none of this can rot.
- Instant navigation has TWO paths, chosen by that detection at runtime start:
  - **Native** (Chrome and Edge today): every page carries a
    `<script type="speculationrules">` that prerenders same-origin documents at
    `eagerness: "moderate"` (hover ~200ms, pointer-down), and `@view-transition`
    animates the cross-document navigation. The router is NOT installed and its
    chunk is never downloaded. This path is strictly better — the next document
    is fully rendered before the click.
  - **Router** (everything else): `runtime.ts` lazily `import()`s
    `./router`, which intercepts clicks and swaps the document in place. It
    removes the loading indicator and the mobile blank flash, which is as close
    to the native path as script can get.
- The router is therefore a separate lazily-imported chunk on purpose. Keep it
  that way: a static import would put it in the inline runtime on every page,
  including every page that will never use it.
- The runtime intercepts same-origin `<a>` clicks and navigates without a
  document load, so the browser never shows its loading indicator and never
  blanks the page. That is the whole reason it exists; on mobile the blank is
  the worst part of a cross-document navigation.
- A link is handled ONLY if it is same-origin, primary-button, modifier-free,
  has no `target`, no `download`, no `rel="external"`, is not a pure hash
  change, and is not inside `[data-no-router]`. Everything else stays a real
  browser navigation, which is what keeps cmd-click, middle-click and "open in
  new tab" behaving natively. `data-no-router` is the opt-out on any element,
  and it applies to the whole subtree.
- `popstate` replays through the same path and restores the scroll offset saved
  in `history.state.scroll`; the outgoing offset is written with
  `replaceState` before each push.
- Every page is emitted TWICE: `index.html`, and `index.partial.html` beside it
  carrying only what a swap replaces — title, the per-page meta and canonical
  tags, that route's CSS fragments, its `#__islands` JSON and its body. The
  router asks for the partial by convention and falls back to the full document
  if it 404s or is not HTML, so an older deploy still navigates correctly.
- The page stylesheet is therefore TWO tags: `<style id="css-base">` (fonts,
  base sheet, view-transition rules — byte-identical on every page, and the
  router never touches it) and `<style id="css-page">` (that route's fragments,
  which a swap replaces). Do not merge them back into one.
- Executable scripts are stripped from the fetched document before it is
  adopted. The runtime is inlined into every page and is already running, so
  re-running it would double every listener; the theme script has already
  applied; analytics stays live in the JS realm without its tag. `<script
  type="application/json">` survives, because `#__islands` is data.
- `<html data-theme>` is never touched by a swap. It is viewer state, not page
  content, so a soft navigation must not reset it to the server-rendered value.
- Islands are unmounted BEFORE the body is replaced, and the generated hydrate
  wrapper returns `() => root.unmount()` to make that possible. Islands register
  listeners on `window` and `document` that outlive their own DOM (the desktop's
  Ctrl+W handler, its breakpoint and clock subscriptions), so without this they
  accumulate one set per navigation. A dynamic island import that resolves after
  a swap is discarded by a generation counter rather than hydrating a detached
  element.
- Prefetch has three triggers, all going through one promise-keyed cache so a
  click consumes an in-flight request rather than starting a second: hover
  (`pointerenter`/`touchstart`), `pointerdown` (~100ms before the click), and
  links entering the viewport (one shared IntersectionObserver at 200px, on
  idle, at most 4 in flight, cache capped at 10). All three are skipped entirely
  when `navigator.connection.saveData` is set or `effectiveType` is 2g or
  slow-2g.
- The `pageswap` handler still exists and still owns cross-document
  transitions, for every navigation the router does NOT intercept.

## Platform module contracts (platform agent)

All take `ctx: BuildContext` and write into `ctx.staticDir` or `ctx.outDir`:

- `og.ts` `writeOgImages(ctx)`: `/opengraph-image.png` and
  `/blog/<slug>/opengraph-image.png` for every post, 1200x630, title + date on
  black, Inter Medium from `app/fonts/Inter-Medium.ttf`, via `@vercel/og` in Node
  (ESM shim per report 03 §3.5). Cache by (slug, title, date) hash in `.cache/og/`.
  Never fetch the network. Export `ogImageUrl(ctx, post?)` for `Head.ogImage`.
- `feeds.ts` `writeFeeds(ctx, { routes, renderPostHtml? })`: `feed.xml` (RSS 2.0,
  published posts + notes + external posts, full HTML bodies rendered by the SAME
  MDX pipeline, which core injects as `renderPostHtml`; without it the feed falls
  back to `marked`), `sitemap.xml`, `robots.txt`, `search-index.json`
  (`{type,title,href,external}[]` identical to today's `/api/search-index`).
  The sitemap's top-level pages are **derived from `routes`**, the manifest the
  build emitted: every single-segment `page` route that is not `noindex`. It is
  never a list written out by hand — that is exactly how the previous sitemap
  came to omit `/blog`, `/notes`, `/labs` and `/talks`. Posts and notes are
  placed by `entryHref`, the same helper the feed and the list pages use.
- `vercel.ts` `writeVercelConfig(ctx)`: `config.json` exactly per
  `04-architecture-design.md` §2.9 (routing-utils redirects + immutable `_assets`
  header, embed query rewrites, `handle: filesystem`, `_assets` 404 no-store guard,
  `handle: error` -> `/404`, `images` block with REGEX remotePatterns for the
  blob host, `formats` avif/webp). The redirects, the embed rewrite, the asset
  prefix and its cache-control string come from `framework/routing.ts`, and
  `sizes`/`qualities` are `IMAGE_WIDTHS`/`IMAGE_QUALITY` imported from
  `framework/images.tsx`. Nothing here restates a number another module owns: a
  width in a `srcset` that is missing from `images.sizes` 400s in production
  only, which is not a failure a comment can prevent.
  Also write root `vercel.json` `{ "$schema": ..., "framework": null,
  "buildCommand": "node scripts/build.mjs", "installCommand":
  "npx --yes pnpm@9.15.9 install --frozen-lockfile" }`. The Vercel project
  dashboard carries a bare `pnpm install` override (the pnpm 6 trap, report 03
  §8.7), so vercel.json must pin an explicit version to neutralise it.
  `scripts/build.mjs` esbuild-bundles `build.ts` and runs it under Node 24
  (`engines.node` = 24.x); `bun run build.ts` is the local path. Do not remove
  or alter `next.config.mjs` (cutover agent does).
- `images.tsx` `<Img src width height alt sizes?>`: emits `/_vercel/image?url=&w=&q=75`
  src + srcset for widths in `[640,828,1200,1920]`, `loading="lazy"`,
  `decoding="async"`. Used by the MDX `img`/`Image` components and the homepage
  (the 754KB `ladybird.png` must go through it). Videos (`.webm`/`.mp4`) pass through.
- `fonts.ts` `prepareFonts(ctx)`: one-time subset of Geist Sans + Geist Mono
  variable woff2 (from `node_modules/geist/dist/fonts/...`) to Latin + Latin-1 +
  common punctuation + arrows using `subset-font`, written to `app/fonts/*.woff2`
  (committed) if missing, then copied to `/_assets/` with hash, returns the
  `@font-face` CSS string + preload hrefs. Report before/after bytes.
  **`build.ts` is its only caller**, and passes the result to
  `runPlatformSteps`. It writes files and mutates `ctx.assets`, so a second
  caller is a second owner of the same build artifact.

## Gates

- Phase 1: `bun run build.ts` produces every route as HTML with zero client JS
  beyond the runtime; `pnpm verify` shows only intended diffs vs baseline.
- Phase 2/3: per-page JS budget: content pages <= runtime only; homepage <= 35KB brotli.
- Phase 4: `vercel build` (CLI) succeeds from the repo root and `vercel deploy --prebuilt`
  preview passes the checklist in `04-architecture-design.md` §7 Phase 4.
- Route reconciliation has three outcomes, not two. A route the build's route
  manifest declares but the baseline lacks is **informational**, reported as
  `added routes: N` and listed: publishing a post adds routes the committed
  baseline cannot contain, and a gate that fails on new content is a gate
  nobody can keep green. A route the baseline has and the build no longer
  emits is **fatal**. An `index.html` in the output that the manifest never
  declared is **fatal**, because it means something is writing pages the page
  registry does not know about. `allowNewRoutes` is therefore only for that
  last case; today its one entry is the KnightOS emulator copied out of
  `public/`.

## Decisions log

- 2026-08-31 Titles: posts render `<post title> | Max Leiter`; notes render
  `<note title> | Max Leiter` (baseline gave every note "Notes | Max Leiter").
  Index/static page titles match the baseline exactly. Deliberate deviation.
- 2026-08-31 Descriptions: posts with no/empty description emit NO description
  tags (matches baseline). Notes without one fall back to
  "Short-form thoughts, code snippets, and tips.", never the site default.
- 2026-08-31 Image preloads: React 19's automatic `<link rel=preload as=image>`
  is dropped. The first `<Img>` in an article renders eager +
  `fetchpriority="high"`; the rest lazy.
- 2026-08-31 Tweets: rendered at build from committed JSON in
  `app/data/tweets/<id>.json` via react-tweet's presentational components,
  full card incl. source link. Missing cache + failed fetch fails the build.
- 2026-08-31 Extension-less imports everywhere under `framework/` and `app/`;
  `tools/` may use `.ts` extensions (runs unbundled). `allowImportingTsExtensions` on.
- 2026-08-31 A failed import of `framework/platform.ts` is fatal in `build.ts`.
- 2026-08-31 Vercel project settings (dashboard) were found to be framework
  "nextjs", installCommand "pnpm install", node 22.x. vercel.json overrides all
  three per-deployment (framework null, pinned npx pnpm install, engines 24.x).
  Cutover should also flip the dashboard to Other / auto-detect install.
- 2026-08-31 Cutover: `next`, `next-mdx-remote`, `next-themes`, `bright`,
  `react-diff-viewer`, `@vercel/analytics`, `postcss`, `@tailwindcss/postcss`,
  `concurrently`, `typescript-plugin-css-modules` and `@types/mdx` are removed.
  `react-tweet` stays (build-time tweet rendering); `geist` stays (fonts.ts
  regenerates the subsets from `node_modules/geist`). Everything is a
  devDependency now, because static output has no runtime dependencies -- so
  `vercel.json`'s install command carries `--prod=false`, since pnpm reads
  `NODE_ENV=production` as an implicit `--prod`.
- 2026-08-31 Cutover: `--breakpoint-3xl: 120rem` is now defined in an `@theme`
  block in `global.css`. The ~21 surviving `3xl:` classes in the desktop chrome
  (inventory item 57) were no-ops; defining the breakpoint restores the
  intended large-screen scaling rather than deleting the intent.
- 2026-08-31 Cutover: the shadcn/ui variable block in `global.css` is deleted.
  Its only consumer was `app/styles/desktop.css`, itself reachable only from
  `app/layout.tsx`; `text-foreground`/`bg-background` were never utilities here
  because those were plain `:root` properties, not `@theme` keys. `--radius`
  reverts from `0.5rem` to the `8px` above it, an identical computed value.
- 2026-08-31 Cutover: `app/lib/types.d.ts` and `app/lib/portfolio-data.ts` are
  gone; the surviving components take their `Note` from `framework/types` and
  their `Project` from `@lib/blog-post`.

### Simplify pass, 2026-08-31

- Canonical URLs are DERIVED, not declared. `Head` has no `canonical` field;
  `entry-server.ts` sets it from the route's own path, and an embed variant
  carries the canonical of the page it varies. `Head.titleSuffix` is deleted:
  no route ever set it, and the branch it guarded reproduced a Next defect the
  Decisions log above explicitly decided not to reproduce.
- `entryHref(entry, base?)` and `POPULAR_SLUGS` live in `app/lib/blog-post.ts`
  and `app/lib/popular-posts.ts`, NOT in `framework/content.ts`. The desktop
  island imports both, and `content.ts` imports `node:fs` and gray-matter,
  which the browser bundle cannot resolve. Anything shared between the build
  and an island has to be a leaf module.
- The node/ESM esbuild options are DATA (`framework/node-bundle.json`), read by
  `build.ts` and `scripts/build.mjs`. The launcher is plain JS run straight by
  node, so it cannot import a `.ts` factory without the type stripping it
  exists to avoid; the two copies had already drifted to different `target`s.
- The build-time size report is inside a timed step and compresses at brotli
  quality 5. It used to run after `total` was computed, so a quarter of the
  build's cost appeared in no table at all.
- `framework/platform.test.ts` asserted `installCommand === undefined` while
  `vercel.ts` writes a pinned one; the assertion was simply failing. It now
  asserts the pinned value. Its route list is an INPUT fixture, not a second
  transcription of the registry: agreement between registry and sitemap is
  structural now, since the build feeds one manifest to both.

### Intended improvements over the production site, 2026-08-31 (QA)

Verified deviations where the new build is better, not merely different:

- `feed.xml` excludes `published: false` content. Production leaked 8 items.
- `sitemap.xml` covers all 7 top-level pages. Production had 3.
- `rel=canonical` is emitted on `/` and on note pages. Production had none.
- `<link rel=alternate type=application/rss+xml>` is on post pages. Production
  had it on the homepage only.
- `og:type` is `article` on posts and notes. Production said `website` on every
  page, articles included.
- The post toolbar's controls are real `<a href>` links. Production rendered
  `<button>`, so they were not navigable without JavaScript.
- The command palette's navigation items are server-rendered.
- `/404` returns a real 404 status.
- `<Diff>` has no published consumer: its only caller is
  `posts/transcribing-typewriter.mdx`, which is `published: false`. It is
  therefore untested in the output, and its CSS fragment ships on 0 pages.
