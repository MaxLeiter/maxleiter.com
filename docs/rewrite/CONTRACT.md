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
- Until cutover, `next` stays installed and the Next app must still build. Do not
  delete or rename files under `app/` that the Next app imports unless you are the
  cutover agent. Add new files; leave old ones.

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
  platform.ts                    runPlatformSteps(ctx) (platform agent owns; see below)
  og.ts feeds.ts vercel.ts images.tsx fonts.ts   (platform agent owns)
  dev.ts                         watch + static server + live reload
  client/runtime.ts              the ~1KB vanilla runtime (islands, theme, cmd-k, clock)
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
- Embed variant: `static/blog/<slug>/embed/index.html` and
  `static/notes/<slug>/embed/index.html`. Homepage iframes point at
  `/blog/<slug>/embed`. A `has: query embed` rewrite keeps old `?embed=true` links working.
- Hashed assets under `static/_assets/<name>.<8-char-hash>.<ext>`, immutable.
- Unhashed root files: `search-index.json`, `feed.xml`, `sitemap.xml`,
  `robots.txt`, `opengraph-image.png`, `blog/<slug>/opengraph-image.png`.
- `public/**` copied verbatim into `static/` (KnightOS emulator, favicons, mc images,
  Search Console verification file). `public/feed.xml` is NOT copied; feeds.ts writes it.
- CSS: one site sheet, inlined into `<head>` of every page (matches today's
  `inlineCss`). Page-scoped CSS is a later optimization, not Phase 1.
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
7. `platform.ts` -> `runPlatformSteps(ctx)` (OG, feeds, sitemap, robots,
   search-index, fonts, config.json). Core calls it last.
8. Copy `public/`. Write `.vercel/output/config.json` (platform).

Scripts to add to package.json (keep the existing Next scripts until cutover):
`"build:bespoke": "bun run build.ts"`, `"dev:bespoke": "bun run framework/dev.ts"`,
`"verify": "bun run tools/diff-html.ts"`, `"snapshot": "bun run tools/snapshot.ts"`.

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
- Runtime hydrates with `hydrate` from `preact/compat/client`... the runtime
  imports `/_assets/island.<name>.<hash>.js` lazily; `client.ts` writes the
  name->URL map into the page as `<script type="application/json" id="__islands">`.
- The runtime also handles, without any island: `[data-theme-toggle]` clicks,
  Cmd/Ctrl+K -> unhide `[data-island="palette"]` and mount it, `[data-track]`
  delegated analytics `track()` calls, `#menubar-clock` ticking.

## Platform module contracts (platform agent)

All take `ctx: BuildContext` and write into `ctx.staticDir` or `ctx.outDir`:

- `og.ts` `writeOgImages(ctx)`: `/opengraph-image.png` and
  `/blog/<slug>/opengraph-image.png` for every post, 1200x630, title + date on
  black, Inter Medium from `app/fonts/Inter-Medium.ttf`, via `@vercel/og` in Node
  (ESM shim per report 03 §3.5). Cache by (slug, title, date) hash in `.cache/og/`.
  Never fetch the network. Export `ogImageUrl(ctx, post?)` for `Head.ogImage`.
- `feeds.ts` `writeFeeds(ctx)`: `feed.xml` (RSS 2.0, published posts + notes +
  external posts, full HTML bodies rendered by the SAME MDX pipeline: import
  `renderPostHtml` from `framework/mdx.ts`, fallback to `marked` only if core has
  not exposed it yet), `sitemap.xml` (all 8 top-level pages + posts + notes, with
  lastmod from dateISO), `robots.txt`, `search-index.json`
  (`{type,title,href,external}[]` identical to today's `/api/search-index`).
- `vercel.ts` `writeVercelConfig(ctx)`: `config.json` exactly per
  `04-architecture-design.md` §2.9 (routing-utils redirects + immutable `_assets`
  header, embed query rewrites, `handle: filesystem`, `_assets` 404 no-store guard,
  `handle: error` -> `/404`, `images` block with REGEX remotePatterns for the
  blob host, `formats` avif/webp, `sizes` [640,828,1200,1920], `qualities` [75]).
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

## Gates

- Phase 1: `bun run build.ts` produces every route as HTML with zero client JS
  beyond the runtime; `pnpm verify` shows only intended diffs vs baseline.
- Phase 2/3: per-page JS budget: content pages <= runtime only; homepage <= 35KB brotli.
- Phase 4: `vercel build` (CLI) succeeds from the repo root and `vercel deploy --prebuilt`
  preview passes the checklist in `04-architecture-design.md` §7 Phase 4.

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
