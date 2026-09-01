# A bespoke static-site framework for maxleiter.com — architecture design

Companion to `01-feature-inventory.md` (what the site does) and `03-vercel-build-output-research.md`
(how a hand-rolled framework deploys to Vercel). Everything numbered below that is labelled
**measured** was run during this session; everything labelled **projected** is arithmetic on top of
measured numbers and is marked as such.

Spike code lives in `spike/` next to this file.

---

## 0. Headline

Figures for Next are from `02-perf-baseline.md`. Live-wire numbers are what a modern browser
actually transfers from `maxleiter.com`, excluding the 112 KB `noModule` core-js chunk that no
ES-module browser downloads.

| `/blog/weights`, live wire, modern browser | Next.js (measured) | Bespoke (projected) |
|---|---|---|
| HTML | 25,270 B | **~9,500 B** |
| Client JS | **180,834 B** / 12 files | **~1,000 B** / 1 file |
| RSC link prefetch | **61,420 B** | **0** |
| Fonts (framework-independent) | 117,204 B | 117,204 B |
| **Total** | **384,728 B** | **~127,700 B** |
| **Total excluding fonts** | **267,524 B** | **~10,500 B** |

| `/`, live wire, modern browser | Next.js (measured) | Bespoke (projected) |
|---|---|---|
| HTML | 24,840 B | **~10,500 B** |
| Client JS | **167,898 B** / 11 files | **~33,000 B** / 2 files |
| RSC link prefetch | **164,891 B** | **0** |
| Fonts + one unoptimized PNG (framework-independent) | 871,745 B | 871,745 B, or ~197,000 B once fixed |
| **Total excluding fonts and images** | **357,629 B** | **~43,500 B** |

**The one structural win is client JavaScript, and it is large.** 111,965 B brotli of React +
Next runtime loads on every page — **80 % of all JS on the homepage and 84 % on a blog post** — and
the site's own code is only 20–27 KB brotli of that. On a prose page that entire runtime does
nothing a user can perceive. Add the 61–165 KB of RSC link prefetch a static site never issues, and
a blog post goes from ~267 KB of framework-attributable transfer to ~10 KB.

**Four claims I made before reading the baseline and now retract:**

1. **Build time is not a win.** A warm `next build` is **2.4 s for 46 pages**. My projected bespoke
   build is ~1.5–2.5 s. That is a wash, and it is not a reason to do anything.
2. **"61–65 % of the HTML is RSC duplication" is misleading.** True in raw bytes, but brotli
   deduplicates the flight payload against the markup it mirrors, so the **marginal** cost is
   **3,697 B on a blog post** and 9,022 B on the homepage. Real, worth having, not dramatic.
3. **HTML size is near the floor already.** 12.2–15.9 KB brotli per document. The bespoke gain is a
   few KB, mostly from shipping per-page CSS instead of one union sheet (§9.1).
4. **Serving and runtime are at the floor.** Local TTFB 1.1–1.3 ms; live TTFB 73–84 ms is pure
   round-trip time. Lighthouse is 99–100 desktop and 92–95 mobile with TBT of 0–3 ms. Lighthouse
   reports **10–450 bytes** of unused JavaScript, so Next's code splitting is essentially perfect.

The largest single byte on this site is not a framework problem at all: a **754,541 B unoptimized
PNG** on the homepage, 59 % of page weight and larger than all JavaScript combined. See §9 for the
framework-independent fixes that should happen regardless of this decision.

---

## 1. Architecture options

### The shared premise

All three options agree on the server side: **there is no server**. Every page is rendered to HTML
at build time and served as a static file from `.vercel/output/static`. Report 01 §1.6 establishes
that nothing on this site needs a request-time server, and the one dynamic route
(`/api/knightos-package`) is dead code. They differ only in what runs in the browser.

They also all agree on the *authoring* language: React + TSX, because that is what the 3,300 lines of
existing components are written in and rewriting them is the dominant cost in any of these plans.

### Option A — React everywhere, islands via `hydrateRoot`

Build with `react-dom/server`'s `renderToStaticMarkup`. Mark subtrees as islands; emit
`<div data-island="x" data-props="...">` around them; a tiny client runtime calls `hydrateRoot` on
each marked element with the matching lazily-imported component.

**Measured floor.** A hello-world island using `useState` + `useReducer` + `useSyncExternalStore`,
bundled with esbuild, minified, `NODE_ENV=production`:

```
out/react.js    raw 194,367   gzip 60,515   brotli 52,066
```

That 52 KB brotli is the price of admission on any page carrying any island.

**What breaks:** nothing. This is the conservative option.

**Per-page projection** (brotli, client JS): blog post ~0.7 KB if the post has no MDX island, else
52 KB + component. Homepage 52 KB + ~19.6 KB app code = **~72 KB**, against 139 KB today. Barely
better than half, on the page where it matters most.

The ~19.6 KB app-code figure is the baseline's, not a guess: the homepage's non-framework JS is
27,322 B brotli, of which next-themes and Vercel Analytics are 7,674 B and both are being replaced
by the 735-byte runtime.

### Option B — Preact + `preact/compat` for client islands

Identical to A, except client bundles alias `react` → `preact/compat`, `react-dom` →
`preact/compat`, `react-dom/client` → `preact/compat/client`. React stays as the build-time
renderer, so authoring, types and `renderToStaticMarkup` are unchanged.

**Measured floor**, same source file, same bundler settings:

```
out/preact.js         raw  19,950   gzip 7,969   brotli 7,274   (preact/compat)
out/preact-native.js  raw  13,338   gzip 5,558   brotli 5,063   (preact + preact/hooks, no compat)
```

**7,274 B brotli versus 52,066 B — a 44.8 KB saving per island-bearing page.**

Two compatibility facts came out of the spike rather than the docs:

- `useSyncExternalStore` imported from `react` resolves and bundles under `preact/compat`. That is
  what `use-is-mobile.ts` needs, and it was the compatibility question I was least sure of.
- `hydrateRoot` is **not** on `preact/compat`; it is on `preact/compat/client`. esbuild fails loudly
  with `No matching export ... for import "hydrateRoot"`, so this is a five-minute discovery, not a
  silent breakage.

**Compatibility risks, honestly:**

| Dependency | Risk under preact/compat | Resolution |
|---|---|---|
| `useReducer`, `useSyncExternalStore`, `useCallback`, `startTransition` | Low — all present in compat | Verified for the first two |
| `next-themes` | N/A — replaced by 40 lines of DOM code either way | Not a risk |
| `react-diff-viewer@3.1.1` | **High.** Peers are `react ^15 \|\| ^16`; deps are `emotion@10`, `create-emotion@10`, `prop-types@15`. It works under React 19 today only because peer ranges are not enforced. | **Delete it.** See §3 — `<Diff>` becomes zero-JS, rendered at build with the `diff` package. This removes ~48 KB of emotion from the 3 posts that use it and removes the risk entirely. |
| `react-tweet@3.3.1` | Medium — `swr` in the client path | **Delete the client path.** `getTweet()` at build + render `react-tweet/dist/twitter-theme/*` to static HTML with React on the server. Zero client JS. |
| React Compiler output | Medium — emits `import { c } from 'react/compiler-runtime'`, which `preact/compat` does not export | Drop the compiler initially (§6, risk 1); a ~10-line `c(size)` shim over `useRef` restores it if profiling demands |

**Per-page projection** (brotli, client JS): blog post ~0.7 KB. Homepage 0.7 KB runtime + 7.3 KB
preact/compat + ~19.6 KB app code = **~27.7 KB**, against 139,287 B today. That lands at the bottom
of the baseline's own independent estimate for this page ("somewhere near 30–40 KB brotli").

### Option C — zero framework, vanilla TS / web components

React only as a build-time template engine. The desktop window manager is rewritten as vanilla TS.

**Rewrite cost.** `desktop-client.tsx` is 779 lines and `window.tsx` is 504. Reading them, the
genuinely stateful surface is: a `useReducer` over
`{openWindows: Set, blogPostSlug, focusedWindow, zIndexes, nextZIndex}` with five action types; and
per-window `position`, `size`, `isDragging`, `isResizing`, `dragOffset`, `snapPreview`, `isSnapped`,
`preSnapState`, driven by mouse *and* touch handlers plus a 20 px edge-snap detector with a live
preview overlay and pre-snap restore. That is a genuine imperative UI — it is the one part of this
site where a framework earns its keep, because every drag frame mutates two objects that six pieces
of markup read.

Realistic estimate: **20–28 hours** to port those 1,283 lines to vanilla TS with equivalent
behaviour, versus **10–14 hours** to port them to Preact (mostly mechanical: strip `next/link`,
`next/navigation`, `next/dynamic`). And the vanilla version is the code you then maintain by hand
forever, with no `key`-based reconciliation for the window list.

**Per-page projection:** blog post ~0.7 KB; homepage ~10–12 KB brotli of hand-written DOM code.
Saves roughly 10 KB brotli over Option B on exactly one page, for double the rewrite cost and a
permanently worse maintenance story.

### Recommendation: **Option B, with Option C applied everywhere except the desktop**

Call it B′. Concretely:

1. **Everything that can be zero-JS is zero-JS.** Post pages, note pages, `/about`, `/labs`,
   `/talks`, `/projects`, `/blog`, `/notes` ship the 735-byte runtime and nothing else. No React, no
   Preact, no hydration.
2. **The 735-byte vanilla runtime** (measured, §3) handles island scheduling, the theme toggle, the
   ⌘K shortcut, and the menubar clock. These are four DOM operations; a component framework is
   overkill for all of them.
3. **Preact + `preact/compat` for the two real islands**: the desktop window manager on `/`, and the
   command palette. Plus the three MDX islands (`FileTree`, `ShotGrid`, `MinecraftInventory`) that
   need component state.
4. **React stays the build-time renderer.** `renderToStaticMarkup` for every page, including the
   islands' initial HTML, so islands hydrate over real markup and the no-JS experience is intact.

Why B′ over pure B: the 7.3 KB compat floor is worth paying on the one page that has a window
manager, and worth *not* paying on the 31 content pages that have a toggle and a keyboard shortcut.
Why B′ over C: the window manager is exactly the workload frameworks exist for, and 7 KB is a cheap
price for keeping it declarative.

Why not A: 52 KB brotli on the homepage against 7.3 KB, for zero functional difference, on a project
whose entire premise is shipping fewer bytes. If Preact ever bites, the alias is one line in the
bundler config and you are back on A.

---

## 2. Build pipeline design

One entry point, `build.ts`, run by **bun** (`bun run build.ts`). Bun is the right call for the local
loop — it runs TypeScript natively with no build step and starts in ~30 ms — but see §6 risk 8 for
the Vercel-build-image caveat, and the pipeline is written so `node --experimental-strip-types`
also works.

### 2.1 Directory layout

```
maxleiter.com/
├── build.ts                    # orchestrator, ~250 LOC
├── framework/
│   ├── content.ts              # readdir + gray-matter + sort + published filter
│   ├── mdx.ts                  # @mdx-js/mdx compile + run, per-file content-hash cache
│   ├── highlight.ts            # shiki dual-theme, singleton highlighter
│   ├── render.ts               # renderToStaticMarkup + <html> shell + <head> builder
│   ├── islands.tsx             # <Island> build-time component + manifest collection
│   ├── css.ts                  # tailwind CLI + lightningcss CSS modules
│   ├── client.ts               # esbuild island bundles, content-hashed
│   ├── og.ts                   # @vercel/og at build time
│   ├── feeds.ts                # feed.xml + sitemap.xml + robots.txt + search-index.json
│   ├── vercel.ts               # .vercel/output/config.json via @vercel/routing-utils
│   └── dev.ts                  # watch + static server + SSE live reload
├── app/                        # unchanged: components, pages as plain TSX functions
├── posts/  notes/  public/     # unchanged
└── .vercel/output/             # build product
    ├── config.json
    └── static/
        ├── index.html
        ├── blog/<slug>/index.html
        ├── blog/<slug>/embed/index.html
        ├── blog/<slug>/opengraph-image.png
        ├── notes/<slug>/index.html
        ├── about/index.html  labs/  talks/  projects/  blog/  notes/
        ├── feed.xml  sitemap.xml  robots.txt  search-index.json
        ├── _assets/app.<hash>.css
        ├── _assets/runtime.<hash>.js
        ├── _assets/island.desktop.<hash>.js
        └── … everything from public/
```

**Directory output, not `overrides`.** Report 03 §8.3 is emphatic: writing
`blog/modern-irc/index.html` makes `/blog/modern-irc` resolve by plain static file serving with no
`overrides` map at all. Astro's Vercel adapter does exactly this and ships zero `overrides` entries;
SvelteKit and Nitro use `overrides` and pay for it with a per-page map that can drift, plus the trap
that `overrides` *moves* a URL so every `dest` pointing at an overridden page must use the new path.
Take the Astro approach.

### 2.2 Pipeline steps, with measured costs

Every number in the "measured" column was produced by a script in `spike/`.

| # | Step | Tool | Measured |
|---|---|---|---|
| 1 | Read `posts/` + `notes/`, gray-matter, filter `published:false`, sort by date | `gray-matter@4.0.3` | ~10 ms (42 files, 199 KB) |
| 2 | Compile MDX → JS | `@mdx-js/mdx@3.1.1` | **123 ms** (`Promise.all`), 178 ms serial |
| 3 | Syntax-highlight 76 code blocks, 10 langs, 2 themes | `shiki@4.4.3` | **383 ms** (32 ms init + 351 ms) |
| 4 | `run()` + `renderToStaticMarkup` all 42 documents | `react-dom@19.2.8` | **34 ms**, 42/42 succeeded |
| 5 | Tailwind 4 CSS, scanning `app/`, minified | `@tailwindcss/cli@4.3.3` | **46 ms** cold → 27,853 B |
| 6 | 7 CSS modules, scoped + minified | `lightningcss` | **15 ms** → 6,614 B |
| 7 | 46 OG PNGs at 1200×630 | `@vercel/og@1.0.2` | **~197 ms** (report 03 §3.5, ~4 ms each) |
| 8 | Island client bundles | `esbuild@0.28.2` | ~150 ms (est. from the 4 bundles built here) |
| 9 | feed/sitemap/robots/search-index | hand-rolled | ~20 ms |
| 10 | Copy `public/` (117 files), write `.vercel/output` | fs | ~100 ms |
| | Runtime startup + module loading | bun | ~200–400 ms |
| | **Projected total, cold** | | **~1.5–2.5 s** |

Steps 2, 3, 4 and 7 parallelise across files; the table is the serial sum, so the projection is
conservative.

**Do not sell this as a win.** A warm `next build` is **2.4 s for 46 pages** (compile 286 ms, static
generation 975 ms). The projected bespoke build lands in the same band. The only genuine build-side
differences are qualitative: no 200 MB `next` package and no 541 MB `node_modules`; a standalone
`tsc --noEmit` that does not fail on generated route types; and per-post OG images actually
prerendered rather than rendered on first request (§9.4). Cold-build figures in the baseline
(3.6–5.8 s compile, 16.5 min static generation) are dominated by a sandbox with outbound network
blocked and should not be compared against anything.

### 2.3 MDX compilation

Compile **once per file at build**, not per render. This is the single biggest build-time lever:
today `next-mdx-remote/rsc` re-runs the full unified pipeline inside the RSC renderer for every page.

```ts
// framework/mdx.ts
import { compile, run } from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'

const mdxOptions = {
  outputFormat: 'function-body' as const,
  development: false,
  remarkPlugins: [
    remarkFrontmatter,
    remarkGfm,
    a11yEmoji,
    [remarkToc, { tight: true, maxDepth: 5 }],
  ],
  rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
}

export async function compilePost(source: string, cacheKey: string) {
  const hit = await cache.get(cacheKey)          // content hash → compiled JS
  const code = hit ?? String(await compile(source, mdxOptions))
  if (!hit) await cache.set(cacheKey, code)
  const mod = await run(code, { ...runtime, baseUrl: import.meta.url })
  return mod.default
}
```

**`blockJS: false` disappears as a concept.** That flag exists because `next-mdx-remote@6` strips JSX
attribute *expressions* by default, silently dropping `width={600}` and `style={{...}}`.
`@mdx-js/mdx` has no such behaviour — it is the compiler `next-mdx-remote` wraps. The spike compiled
and rendered **all 42 files, 42/42 successful**, including the ones carrying attribute expressions.
Checklist item 29 is satisfied by using the underlying tool directly.

### 2.4 Syntax highlighting

`bright@1.0.0` is unmaintained, async-RSC-only, and does `import "server-only"`. Replace with shiki,
configured to reproduce bright's exact `[data-theme="light"]` switching.

```ts
const hl = await createHighlighter({
  themes: ['material-theme-palenight', 'solarized-dark'],
  langs: [...],                          // 10 langs actually used across all 42 files
})

const html = hl.codeToHtml(code, {
  lang,
  themes: { light: 'material-theme-palenight', dark: 'solarized-dark' },
  defaultColor: false,                   // emits BOTH themes as CSS variables
  cssVariablePrefix: '--s-',
  transformers: [styleToClass],          // @shikijs/transformers
})
```

`defaultColor: false` emits, verbatim from the spike output:

```html
<pre class="shiki shiki-themes material-theme-palenight solarized-dark"
     style="--s-light:#babed8;--s-dark:#839496;--s-light-bg:#292D3E;--s-dark-bg:#002B36">
```

which maps to bright's `lightSelector` with four CSS rules:

```css
pre.shiki, pre.shiki span {
  color: var(--s-dark);
  background-color: var(--s-dark-bg);
  font-weight: var(--s-dark-font-weight, inherit);
}
[data-theme='light'] pre.shiki, [data-theme='light'] pre.shiki span {
  color: var(--s-light);
  background-color: var(--s-light-bg);
  font-weight: var(--s-light-font-weight, inherit);
}
```

Both themes are in the HTML, CSS picks one, zero client JS, no flash. Checklist item 23 satisfied.

**Use `transformerStyleToClass`.** Measured on a real 233-byte TypeScript block from
`posts/my-tips-for-nextjs-14.mdx`:

| Output form | HTML bytes | gzip | shared CSS |
|---|---|---|---|
| inline styles (default) | 4,519 | 593 | — |
| `transformerStyleToClass` | **2,374** | **453** | 748 B (302 gzip), once per site |

47 % smaller raw markup for the price of one shared rule block. Across 76 blocks that is roughly
160 KB of raw HTML removed site-wide.

### 2.5 Rendering and the `<head>`

No metadata framework. A typed object and a function:

```tsx
// framework/render.ts
export function renderPage(page: Page): string {
  const body = renderToStaticMarkup(<page.Component {...page.props} />)
  return '<!doctype html>' + renderToStaticMarkup(
    <html lang="en" data-theme="dark" style={{ colorScheme: 'dark' }}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{page.title ? `${page.title} | Max Leiter` : 'Max Leiter'}</title>
        <meta name="description" content={page.description} />
        <link rel="canonical" href={`https://maxleiter.com${page.path}`} />
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
        {ogTags(page)} {twitterTags(page)}
        <link rel="preload" as="font" type="font/woff2" crossOrigin=""
              href="/_assets/Geist-Variable.woff2" />
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body dangerouslySetInnerHTML={{ __html: body + islandScripts(page) }} />
    </html>
  )
}
```

`THEME_SCRIPT` is the no-flash blocking script, ~230 bytes minified, replacing next-themes:

```js
try{var t=localStorage.theme||'system',d=document.documentElement,
e=t=='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;
d.dataset.theme=e;d.style.colorScheme=e}catch(_){}
```

Because the server renders `data-theme="dark"` and this script corrects it before first paint, there
is no `suppressHydrationWarning` and no mismatch — there is no hydration on these pages at all.

### 2.6 CSS

**Global sheet.** `@tailwindcss/cli` compiling `app/styles/global.css` with an `@source` pointing at
`app/`. Measured: **46 ms cold, 32 ms warm, 27,853 bytes minified** (6,538 gzip / 5,739 brotli).

That one sheet covers the entire site. Measured against what Next inlines today:

| | raw | gzip -9 |
|---|---|---|
| Next inlines into `/blog/weights` | **47,963** | 10,179 |
| Next inlines into `/` | 30,728 | 7,063 |
| This Tailwind build (whole site, one sheet) | **27,853** | 6,530 |
| The 7 CSS modules, scoped and minified | 6,614 | — |

**`/blog/weights` uses no FileTree, no ShotGrid and no Tweet, yet Next inlines the CSS for all
three.** I verified by string search that the inlined block on that page contains both `react-tweet`
and file-tree rules. Emitting only the CSS a page actually references takes it from 47,963 B to
27,853 B — roughly **3.6 KB of gzip saved per post page**, and the largest single HTML-size lever
available. This is the one place the baseline's "HTML is already near the floor" verdict has real
headroom.

**Inline it into `<head>`**, matching `experimental.inlineCss` and checklist item 46. ~6.5 KB
gzip-grade per document with zero render-blocking requests beats one cacheable request for a site
whose typical visit is a single page arriving from search or Hacker News. (If analytics ever show
high multi-page sessions, flipping to a hashed `<link>` with `immutable` caching is a two-line
change — and note that with `immutable` caching the CSS would be served from the CDN's edge at full
brotli quality on a repeat visit, which inline CSS never gets. See §9.3.)

**CSS modules — recommendation: `lightningcss`.** Measured: all 7 modules bundled, scoped and
minified in **15 ms**, 6,614 bytes total.

```ts
const { code, exports } = bundle({
  filename: absPath,
  cssModules: { pattern: '[hash]_[local]' },
  minify: true,
})
// exports → { note: { name: 'R0dO5a_note' }, content: {...}, icon: {...} }
```

An esbuild plugin resolves `*.module.css` imports to a generated JS object of those names and
appends `code` to the global sheet. The one gotcha the spike surfaced: three of the seven modules
begin with `@reference "tailwindcss"`, which lightningcss passes through as an unknown at-rule.
**Zero of the seven actually use `@apply`** — verified by grep — so the `@reference` lines are
vestigial and can simply be stripped by the plugin. Bun's bundler also supports CSS modules and
would work; lightningcss is the recommendation because it is a library call inside `build.ts` rather
than a second bundler invocation, and because it is the same engine Tailwind 4 already uses.

### 2.7 Fonts

`geist@1.5.1` is a wrapper over `next/font/local` pointing at two woff2 files. Copy them to
`_assets/` and write the `@font-face` blocks by hand:

```css
@font-face {
  font-family: 'Geist Variable'; font-style: normal; font-weight: 100 900;
  font-display: swap; src: url('/_assets/Geist-Variable.woff2') format('woff2');
}
:root { --font-geist-sans: 'Geist Variable'; --font-geist-mono: 'Geist Mono Variable'; }
```

The existing `--font-sans` / `--font-mono` tokens in `global.css` consume those variables unchanged.
Add `<link rel="preload" as="font" crossorigin>` for both, which Next does automatically today.

`app/fonts/Inter-Medium.ttf` stays in the repo for OG generation only. satori accepts TTF/OTF/WOFF
but **not WOFF2** (report 03 §3.5), so this file cannot be consolidated with the web fonts.

### 2.8 Islands and client bundles

`framework/islands.tsx` exports a build-time component:

```tsx
export function Island<P>({ name, props, on = 'idle', children }: IslandProps<P>) {
  manifest.add(name)                                     // collected for the bundler
  return (
    <div data-island={name} data-on={on}
         data-props={props ? JSON.stringify(props) : undefined}>
      {children}                                         {/* SSR'd fallback markup */}
    </div>
  )
}
```

`children` is the server-rendered version, so the page works with JavaScript disabled and the island
hydrates over real markup rather than replacing an empty div.

Bundling, per island, with esbuild:

```ts
await esbuild.build({
  entryPoints: manifest.entries(),        // one per island
  bundle: true, minify: true, splitting: true, format: 'esm',
  outdir: '.vercel/output/static/_assets',
  entryNames: 'island.[name].[hash]',
  chunkNames: 'chunk.[hash]',
  jsx: 'automatic', jsxImportSource: 'preact',
  alias: {
    react: 'preact/compat',
    'react-dom': 'preact/compat',
    'react-dom/client': 'preact/compat/client',
  },
  define: { 'process.env.NODE_ENV': '"production"' },
})
```

`splitting: true` means Preact is emitted once as a shared chunk rather than duplicated per island.

### 2.9 Vercel output

```ts
import { getTransformedRoutes } from '@vercel/routing-utils'

const { routes } = getTransformedRoutes({
  trailingSlash: false,
  redirects: [
    { source: '/X11',  destination: '/blog/X11', permanent: true },
    { source: '/atom', destination: '/feed.xml', permanent: true },
    { source: '/feed', destination: '/feed.xml', permanent: true },
    { source: '/rss',  destination: '/feed.xml', permanent: true },
  ],
  headers: [{
    source: '/_assets/(.*)',
    headers: [{ key: 'cache-control', value: 'public, max-age=31536000, immutable' }],
  }],
})

writeFileSync('.vercel/output/config.json', JSON.stringify({
  version: 3,
  routes: [
    ...routes,
    // back-compat: old ?embed=true links land on the embed variant
    { src: '^/blog/([^/]+)$', has: [{ type: 'query', key: 'embed' }],
      dest: '/blog/$1/embed', continue: false },
    { src: '^/notes/([^/]+)$', has: [{ type: 'query', key: 'embed' }],
      dest: '/notes/$1/embed', continue: false },
    { handle: 'filesystem' },
    // never let a missing hashed asset inherit the immutable header
    { src: '^/_assets/.+', status: 404,
      headers: { 'cache-control': 'no-store' }, continue: false },
    { handle: 'error' },
    { src: '/.*', dest: '/404', status: 404 },
  ],
  images: {
    sizes: [640, 750, 828, 1080, 1200, 1920],
    domains: [],
    qualities: [75],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    remotePatterns: [{
      protocol: 'https',
      // REGEX here, not a glob — this is the #1 copy-paste trap from next.config.mjs
      hostname: '^tddeuevmbjbaaeoi\\.public\\.blob\\.vercel-storage\\.com$',
      port: '',
      pathname: '^/blog/.*$',
    }],
  },
  cache: ['node_modules/**', '.cache/**'],
  framework: { version: '0.1.0' },
}))
```

Three things worth restating because they are easy to get wrong and cost a deploy cycle each:

1. `hostname` and `pathname` in `config.json` are **regexes**, not the glob wildcards
   `next.config.mjs` uses. Copying the `remotePatterns` block verbatim silently matches nothing
   (report 03 §3.2).
2. `getTransformedRoutes` emits `handle: 'filesystem'` **only if you pass `rewrites`**. Add the
   marker yourself, as above.
3. Header routes must carry `continue: true` or routing terminates and you serve an empty 200. The
   helper's `convertHeaders` sets it automatically, which is the reason to go through the helper
   rather than hand-writing.

Project config stays minimal — one route table is much easier to reason about than two interleaved
ones (report 03 §2.3):

```json
{ "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null, "buildCommand": "bun run build.ts" }
```

### 2.10 Images

`next/image` covers 61 remote blob-storage URLs. The replacement is a build-time helper emitting
`/_vercel/image` URLs, which is a **platform** feature, not a framework feature — enabled purely by
the `images` key above.

```tsx
const W = [640, 828, 1200, 1920]                    // every value must be in images.sizes
export function Img({ src, width, height, alt, ...rest }) {
  const u = (w: number) =>
    `/_vercel/image?url=${encodeURIComponent(src)}&w=${w}&q=75`
  return <img src={u(1200)} srcSet={W.map(w => `${u(w)} ${w}w`).join(', ')}
              sizes="(max-width: 700px) 100vw, 700px"
              width={width} height={height} alt={alt}
              loading="lazy" decoding="async" {...rest} />
}
```

`MDXImage`'s `?w=` / `?h=` URL-parameter parsing for intrinsic dimensions (checklist item 26) ports
across unchanged — it is 15 lines of `URLSearchParams` with a 550×450 default.

Keep `sizes` to four widths and `qualities` to a single value: every distinct
(url, w, q, output-format) tuple is a separate billable transformation, and the Hobby allowance is
5K/month.

### 2.11 Feeds, sitemap, search index

All three are pure functions over the content array, and porting them is the moment to fix the two
bugs report 01 found:

- **`scripts/rss.mts` does not filter `published: false`.** All 30 posts and 12 notes go into
  `feed.xml` today, including 11 unpublished ones. That is a live content leak. The rewrite reads
  from the same filtered array every page uses, so the bug cannot recur.
- **`sitemap.ts` omits `/blog`, `/notes`, `/labs`, `/talks`** and needs two `@ts-expect-error`s for
  a `lastModified` field nothing ever sets. Generate from the route list; drop the dead field.

Also: `next build` and `build-rss` currently run concurrently under `concurrently` and both touch
`public/feed.xml`, so the feed Next copies can be the previous build's. One `build.ts` removes the
race by construction.

`search-index.json` becomes a plain static file. The API route existed only to keep the index out of
every page's RSC payload — with no RSC payload, it is just a file, and the palette's `fetch` target
changes from `/api/search-index` to `/search-index.json`.

### 2.12 OG images

`@vercel/og@1.0.2` in plain Node at build time, measured at ~4 ms per image and ~197 ms for 45
(report 03 §3.5). It vendors `yoga.wasm` and `resvg.wasm`, so there are no native modules and no
node-gyp in the build container. The required shim, because the bundle inlines an Emscripten module
that calls `require('fs')` and reads `__dirname`:

```js
import { createRequire } from 'node:module'
const require_ = createRequire(import.meta.url)
globalThis.require = require_
globalThis.__dirname = path.dirname(require_.resolve('harfbuzzjs/index.js'))
globalThis.__filename = require_.resolve('harfbuzzjs/index.js')
const { ImageResponse } = await import('@vercel/og')   // dynamic, AFTER the shims
```

Fix while porting: today `blog/[slug]/opengraph-image.tsx` **fetches the post source over the network
from `raw.githubusercontent.com/.../master/posts/<slug>.mdx`** and regex-scrapes the frontmatter, so
a new post gets a 404 OG image until it is pushed to `master`. Read the local file — the build
already has it parsed. Also fix the declared `size` of 1200×600 against the rendered 630.

### 2.13 Dev mode, and what it costs you

```ts
// framework/dev.ts — ~150 LOC
Bun.serve({
  port: 3000,
  fetch(req) {
    const p = new URL(req.url).pathname
    if (p === '/__reload') return sse(stream)          // EventSource, one line of client JS
    return serveFile(join(OUT, p, 'index.html')) ?? serveFile(join(OUT, p)) ?? notFound()
  },
})
watch(['posts', 'notes', 'app'], async (file) => {
  await rebuild({ only: affectedPages(file) })         // content-hash cache skips unchanged work
  stream.send('reload')
})
```

A 12-byte `<script>` appended in dev subscribes to `/__reload` and calls `location.reload()`.

**Honest accounting of what is lost versus `next dev`:**

| | `next dev` | Bespoke dev |
|---|---|---|
| Startup | Not measured for `next dev`. For calibration, `next start` was ready in 97 ms and a warm `next build` is 2.36 s | ~50 ms + first build ~1.5 s |
| Editing a post | HMR, sub-second, scroll preserved | Full reload, ~150–300 ms with per-file caching |
| Editing a component | React Fast Refresh, **component state preserved** | Full reload, **state lost** |
| Editing CSS | Injected without reload | Full reload (Tailwind rebuild is 32 ms) |
| Error overlay | Rich, source-mapped, in-page | Stack trace in the terminal |
| Typed routes | `PageProps<'/blog/[slug]'>` generated | Hand-written types, or generate a `routes.d.ts` |
| Missing-import errors | In-browser | esbuild output in the terminal |

**This is the real cost of the migration and it should not be undersold.** Losing Fast Refresh while
iterating on window-drag physics is genuinely worse than what exists today. Two mitigations: keep
the desktop island in a small Vite playground during development (Vite gives Preact Fast Refresh for
free and the island is a plain component with props), and cache MDX-compile and shiki output by
content hash so an incremental rebuild only touches the changed file.

---

## 3. Islands and hydration model

### 3.1 The runtime — measured, not estimated

The full client runtime was written and bundled during this session:

```
out/runtime.js    raw 1,772   gzip 891   brotli 735
```

735 bytes, brotli, covering all four cross-cutting behaviours:

```ts
// island scheduling: load | idle | visible | interaction
function schedule(el: HTMLElement) {
  const mode = el.dataset.on || 'idle'
  if (mode === 'load') return void mount(el)
  if (mode === 'visible') { /* IntersectionObserver, rootMargin 200px */ }
  if (mode === 'interaction') {
    for (const t of ['pointerenter','pointerdown','focusin','keydown'])
      el.addEventListener(t, () => mount(el), { once: true, passive: true })
    return
  }
  ;(window.requestIdleCallback || (f => setTimeout(f, 200)))(() => mount(el))
}

// theme toggle — delegated, no framework, no next-themes
document.addEventListener('click', e => {
  if (!e.target.closest('[data-theme-toggle]')) return
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  try { localStorage.theme = next } catch {}
  document.documentElement.dataset.theme = next
  document.documentElement.style.colorScheme = next
})

// ⌘K works BEFORE the palette island loads
addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openPalette() }
})
const openPalette = () => {
  const el = document.querySelector('[data-island="palette"]')
  if (el) { el.hidden = false; mount(el) }        // reveals SSR'd shell, then hydrates
}
```

The palette detail matters and is the one thing an islands architecture usually gets wrong. The
palette's shell — overlay, input, empty list — is **server-rendered into every page inside a
`hidden` div**, roughly 400 bytes of markup. ⌘K unhides it and focuses the input immediately, at
which point the user can type; the island module and `search-index.json` load in parallel and
populate the list when they arrive. The keyboard shortcut is never dead, and typing is never
swallowed. Today's implementation has the palette behind `next/dynamic({ssr:false})`, so the first
⌘K waits on a network round trip before anything appears.

### 3.2 What becomes an island

| Component | Island? | Framework | Trigger | Notes |
|---|---|---|---|---|
| Desktop window manager (`/`) | Yes | Preact | `load` | The whole homepage app. SSR'd markup underneath so `/` renders without JS |
| Command palette | Yes | Preact | `interaction` | Shell SSR'd hidden; shortcut handled by the 735 B runtime |
| `FileTree` / `File` / `Folder` | Yes | Preact | `visible` | 2 trees across all posts. Expanded state + `role="treeitem"` |
| `ShotGrid` / `Shot` | Yes | Preact | `visible` | 1 grid. Lightbox with keyboard nav |
| `MinecraftInventory` | Yes | Preact | `visible` | 1 post. See §6 risk 9 about the 53 base64 images |
| Calculator (KnightOS) | Yes | none | `interaction` | Already a self-contained RequireJS + asm.js app in `public/knightos/`. The React wrapper becomes ~30 lines of vanilla mount code |
| Analytics | No | — | — | `<script defer src="/_vercel/insights/script.js">`. Platform-served, no npm dependency. Auto-tracks pageviews on full loads |

| Component | Zero-JS strategy |
|---|---|
| `WindowToolbar` on post pages | **maximize** → `<a href="/blog/<slug>">`; **close** → `<a href="/">`; **minimize** → `<a href="/?openPost=<slug>">`. All three are `router.push` calls today. They become links, which also makes them middle-clickable and keyboard-native |
| `<Note>` (11 uses) | Static `<aside>`. Already is |
| `<Details>` (2 uses) | Native `<details>/<summary>`. The comment in the current code says it was hand-written "due to a hydration error I can't quite figure out" — with no hydration there is no error |
| `<Tweet>` (1 use) | `getTweet(id)` from `react-tweet/api` at build; render `react-tweet/dist/twitter-theme/*` with `renderToStaticMarkup`. Ships zero JS and no `swr` |
| `<Diff>` (3 uses) | **Compute the diff at build** with the `diff` package and emit a static two-column table. Deletes `react-diff-viewer@3.1.1` and ~48 KB of emotion. These diffs are of static text; nothing about them was ever interactive |
| Code blocks | shiki dual-theme HTML + 4 CSS rules |
| Theme toggle button | Plain `<button data-theme-toggle>` handled by the runtime |
| Menubar clock | 60-byte inline script next to the element |

### 3.3 The hydration workarounds disappear

Two hand-rolled hacks exist today purely to stop React from complaining, and both are artefacts of
hydration rather than requirements of the design.

**`__IS_EMBED__`.** Today `blog/[slug]/page.tsx` injects a blocking inline script that reads
`?embed`, sets a global, and **physically `.remove()`s `#blog-toolbar` from the DOM** before React
hydrates, so a `useState` initializer reading that global produces a matching tree.

The clean replacement: **emit two HTML files.** `blog/<slug>/index.html` and
`blog/<slug>/embed/index.html`, the second rendered with `toolbar={false}`. The homepage's iframe
points at `/blog/<slug>/embed` instead of `/blog/<slug>?embed=true`.

I evaluated this against the alternative of keeping one file plus a CSS rule keyed off a query
param — CSS cannot see the query string, so that variant requires JavaScript and is strictly worse.
Cost of two variants: 31 extra HTML files (23 posts + 8 notes), roughly 1.1 MB on disk, zero bytes on
the wire since no visitor loads both. Benefit: the inline script, the DOM surgery, and the global
all disappear, and the embed variant can drop the toolbar markup entirely rather than hiding it.
Old `?embed=true` links keep working through the `has: [{type: 'query', key: 'embed'}]` route in
§2.9. **Recommend the two-variant approach.**

**`__INITIAL_TIME__`.** Today an inline script writes `toLocaleTimeString` into `#menubar-clock` and
stashes it on a global so `useState` can seed from it without a mismatch. With no hydration, the
clock is four lines in the runtime and a 60-byte inline script to avoid a first-paint flash. The
global goes away.

### 3.4 What the no-JS experience becomes

Better than today, and this matters for the owner's stated "must work without JavaScript"
constraint. Right now `/` renders its SSR'd desktop markup but every window button is a dead
`onClick`. Under this design the toolbar buttons are anchors, the post list is anchors, `<details>`
is native, code is highlighted, themes follow `prefers-color-scheme` through the CSS, and only the
draggable-window behaviour is missing.

---

## 4. View transitions

### 4.1 The current situation

`app/components/page-transition.tsx` and `view-transition-wrapper.tsx` both do
`import { ViewTransition } from 'react'`. **The installed `react@19.2.8` does not export it** — it
resolves only because Next aliases the bare `react` specifier to its own vendored
`next/dist/compiled/react`. Any framework that does not perform that aliasing loses this import
immediately. The rendered output is visible in the built HTML as `vt-name="blog-post-weights"`,
`vt-update="auto"` and `vt-share="auto"` attributes, which React converts to `view-transition-name`
at runtime.

Project memory records that under this setup **browser back/forward can never animate**, because the
transition boundary lives in the root layout and popstate does not re-render through it. So the bar
to clear is: same-document soft-nav transitions, forward only.

### 4.2 The three options

**(i) Cross-document view transitions.** Opt in with CSS in both documents:

```css
@view-transition { navigation: auto; }
```

The inventory (§4.5) claims named element transitions are *not* supported cross-document. **That
claim is wrong.** Chrome's own documentation states: *"The browser takes snapshots of elements that
have a unique `view-transition-name` on both the old and new page"* — which is precisely the
old-document-to-new-document element match. `pageswap` fires on the outgoing document before
snapshots are captured and `pagereveal` on the incoming one before its first render; both expose
`event.viewTransition`, so a transition name can be assigned dynamically per navigation. Restrictions
are same-origin only (same scheme, host and port), and URL-bar navigations, bookmarks and
user-initiated reloads are excluded.

The finding that decides this section: **`navigation: auto` includes `traverse` navigations, i.e.
back/forward animates.** That is a capability the current Next implementation does not have at all.

Support is the real constraint. Chrome/Edge 126+ and Safari 18.2+ ship cross-document transitions.
Firefox does not — sources disagree on whether it has landed, and MDN's own status line for
`@view-transition` reads *"Limited availability, explicitly not Baseline, because it does not work in
some of the most widely-used browsers."* Treat Firefox as unsupported. This is a pure progressive
enhancement: unsupported browsers navigate normally with no error and no fallback code. The site's
own browserslist floor (`firefox 111`, `safari 16.4`) is already below the View Transitions baseline,
so transitions are progressive enhancement today too.

**(ii) A tiny same-document navigation layer.** ~2 KB: intercept same-origin clicks, `fetch` the next
HTML, swap `<main>` inside `document.startViewTransition()`, `pushState`. Gets Firefox nothing (it
lacks `startViewTransition` for the same-document API too, until recently), reintroduces a
client-side router — scroll restoration, focus management, `popstate`, cancelled navigations, script
re-execution in swapped content — and pushes 2 KB onto every page to reproduce something the platform
now does for free. It also breaks the "zero JS on content pages" property that is the main result of
this design.

**(iii) Drop transitions.** Free, and loses a deliberate design touch.

### 4.3 Recommendation: (i), cross-document

```css
@view-transition { navigation: auto; }

::view-transition-old(root), ::view-transition-new(root) { animation-duration: 180ms; }
@media (prefers-reduced-motion: reduce) { @view-transition { navigation: none; } }
```

Named pairs, matching what the site already assigns:

```css
/* on /blog and /  */ .post-card[data-slug='weights'] { view-transition-name: blog-post-weights; }
/* on /blog/weights */ article                        { view-transition-name: blog-post-weights; }
```

The name must be unique per document, so generate it per card from the slug and emit the matching
name on the article. `pageswap` on the outgoing document narrows it to the card actually clicked:

```js
addEventListener('pageswap', (e) => {
  const slug = e.activation?.entry?.url?.match(/\/blog\/([^/]+)/)?.[1]
  if (!slug) return
  document.querySelectorAll('[data-slug]').forEach(el => el.style.viewTransitionName = '')
  const card = document.querySelector(`[data-slug="${CSS.escape(slug)}"]`)
  if (card) card.style.viewTransitionName = 'blog-post'
})
```

That is ~15 lines added to the runtime, and only on pages with post lists.

Net against today: **equal or better in Chrome and Safari** (named element morphs plus back/forward,
which Next's version never had), **equal in Firefox** (neither works), and it costs zero client JS
for the basic cross-fade.

The one thing it cannot do is the homepage's iframe-window morph, because that transition is
same-document — a window opening on `/` is not a navigation. That stays inside the desktop island,
where `document.startViewTransition()` is called directly. Four lines, no React `<ViewTransition>`,
no vendored React.

---

## 5. Spike measurements

All run this session on darwin-arm64, Node v20.20.2 / bun 1.3.11, in `spike/`.

### 5.1 Bundle-size floor — the framework tax

Source: `useState` + `useReducer` + `useSyncExternalStore` + `hydrateRoot`. esbuild, `--bundle
--minify --format=esm`, `NODE_ENV=production`.

| Bundle | raw | gzip | brotli |
|---|---|---|---|
| React 19.2.8 + react-dom/client | 194,367 | 60,515 | **52,066** |
| Preact 10.29.8 + preact/compat | 19,950 | 7,969 | **7,274** |
| Preact 10.29.8, no compat | 13,338 | 5,558 | **5,063** |
| Bespoke vanilla runtime (islands + theme + ⌘K + clock) | 1,772 | 891 | **735** |

`preact/compat` saves **44,792 B brotli** over React on any island-bearing page. Dropping compat
saves a further 2.2 KB but breaks `useSyncExternalStore` imports from `react` and is not worth the
churn.

### 5.2 Shiki dual-theme

76 code blocks extracted by regex from all 42 files in `posts/` + `notes/`; 20 distinct fence tags of
which 10 are real languages (the rest are `sidebar`, `warning-dialog`, `my-action` and similar
pseudo-tags that fall back to `text`).

| | |
|---|---|
| Highlighter init, 10 langs × 2 themes | **32 ms** |
| Highlight 76 blocks | **351 ms** |
| **Total** | **383 ms** |
| Output HTML, all blocks | 295.5 KB (avg 3,981 B/block) |

Dual-theme output confirmed as CSS variables switchable by `[data-theme="light"]` — see §2.4 for the
emitted markup and the four CSS rules. With `transformerStyleToClass`, a real 233-byte block goes
from 4,519 B to 2,374 B of HTML plus 748 B of shared CSS.

### 5.3 MDX compile and render

42 files, 199 KB of MDX source, full plugin stack (`remark-frontmatter`, `remark-gfm`,
`@fec/remark-a11y-emoji`, `remark-toc`, `rehype-slug`, `rehype-autolink-headings`).

| | |
|---|---|
| `compile()` × 42, serial | 178 ms |
| `compile()` × 42, `Promise.all` | **123 ms** |
| Compiled JS output | 372 KB |
| `run()` + `renderToStaticMarkup()` × 42 with stub components | **34 ms** |
| Rendered HTML | 230 KB |
| Successes | **42 / 42** |

### 5.4 Tailwind 4

`@tailwindcss/cli@4.3.3`, input = `global.css` with `@source` pointing at the real `app/` directory,
`--minify`.

| | |
|---|---|
| Cold | **46 ms** |
| Warm | 32 ms |
| Output | **27,853 B** (6,538 gzip / 5,739 brotli) |

### 5.5 CSS modules

`lightningcss` `bundle()` with `cssModules`, all 7 modules: **15 ms, 6,614 B total**. Class names
scope correctly (`note` → `R0dO5a_note`). Zero `@apply` usages across all 7 files, so the three
vestigial `@reference "tailwindcss"` lines can simply be stripped.

### 5.6 Projected totals

**Cold build.** Sum of measured steps: 123 (MDX) + 383 (shiki) + 34 (render) + 46 (CSS) + 15 (CSS
modules) + 197 (OG, from report 03) = **798 ms**, plus ~150 ms esbuild, ~100 ms file IO, ~300 ms
runtime startup → **~1.5 s, conservatively 2.5 s.** Steps parallelise, so this is an upper bound.
Against a 2.4 s warm `next build`, this is **not a win**; see §2.2.

**Per-page bytes.** Two compression columns, because they answer different questions. "brotli q11"
is the theoretical figure and is what the baseline uses for local measurements. "wire" is what
Vercel actually sends, and Vercel compresses on the fly at a low brotli level — measured on the
react-dom chunk, its brotli output (73,291 B) is **worse than its own gzip** (72,595 B) and 19 %
worse than local brotli q11 (61,552 B). So wire ≈ gzip-grade. Project against wire.

| | Blog post (`/blog/weights`) | Homepage (`/`) |
|---|---|---|
| Markup | 8,718 raw | 29,045 raw |
| Inline CSS (page-scoped) | 27,853 raw | 27,853 raw |
| Inline scripts (theme + clock) | ~300 raw | ~300 raw |
| **HTML, brotli q11** | ~8,000 | ~9,000 |
| **HTML, wire (gzip-grade)** | **~9,500** | **~10,500** |
| Client JS, brotli q11 | 735 | 27,659 |
| **Client JS, wire** | **~1,000** | **~33,000** |
| RSC prefetch | **0** | **0** |
| Fonts (unchanged) | 117,204 | 117,204 |
| Requests | 1 HTML + 1 JS + 2 woff2 + analytics = **5** | same = **5** |

Against measured live wire for the same pages: `/blog/weights` is 25,270 (HTML) + 180,834 (modern
JS) + 61,420 (prefetch) = **267,524 B** excluding fonts, versus **~10,500 B** projected. `/` is
24,840 + 167,898 + 164,891 = **357,629 B** excluding fonts and images, versus **~43,500 B**
projected.

The homepage app-code figure of 19,648 B brotli is the baseline's measured non-framework JS on `/`
(27,322 B) minus next-themes and Vercel Analytics (7,674 B), both of which the 735-byte runtime
replaces. It assumes the Preact port is byte-for-byte as large as the React original, which is
pessimistic (no React Compiler memo-cache output, no `next/link` or `next/navigation` glue) but I
would rather over-state it. It remains the least certain number in this document.

---

## 6. Risk register

**1. Losing the React Compiler.** `reactCompiler: true` and `turbopackRustReactCompiler: true` are
on, and the code is written assuming auto-memoization — inline callbacks everywhere, very few
`useMemo`s. The Babel plugin emits `import { c } from 'react/compiler-runtime'`, which
`preact/compat` does not export.
*Mitigation:* after this migration there is almost no React left to memoize — one island. Drop the
compiler in Phase 3 and profile window dragging. If it janks, either alias `react/compiler-runtime`
to a ~10-line `c(size)` over `useRef`, or hand-memoize the two or three hot paths. Do not wire up
Babel for the whole build; the Rust compiler is Turbopack-only and the JS fallback is slow enough to
undo the build-time win.

**2. `react-diff-viewer@3.1.1`.** Peers `react ^15 || ^16`, deps `emotion@10` and `prop-types`.
Already technically unsupported on React 19; it will be worse on `preact/compat`.
*Mitigation:* delete it. Render diffs at build with the `diff` package into a static table. Used by 3
posts, none of them interactively. This turns a risk into a ~48 KB saving.

**3. `react-tweet` without RSC.** The package's `react-server` export condition selects the async
server variant; outside an RSC graph the import resolves to the client variant with `swr`.
*Mitigation:* import `getTweet` from `react-tweet/api` explicitly at build, render
`react-tweet/dist/twitter-theme/*` with `renderToStaticMarkup`, ship the HTML plus `theme.css`. One
post uses `<Tweet>`; `<TweetThread>` is used by zero and should be deleted.
*Residual risk:* the theme components are a deep import into `dist/`, not a public export, so a minor
version bump can move them. Pin the version, or paste the ~200 lines of markup into the repo.

**4. `next-themes` replacement.** Flash-of-wrong-theme is the most visible possible regression.
*Mitigation:* the ~230-byte blocking script in §2.5 runs before first paint and is strictly simpler
than what next-themes injects — there is no hydration to reconcile, which is the only hard part.
Verify explicitly with a throttled reload in Phase 2.

**5. `@vercel/og` ESM shim fragility.** Three `globalThis` assignments to satisfy an inlined
Emscripten module. A `@vercel/og` bump could change the internals.
*Mitigation:* pin `@vercel/og@1.0.2` exactly. Isolate OG generation in `framework/og.ts` and give it
a `try/catch` that logs and reuses the previous PNG rather than failing the build. Falling back to
CommonJS for that one module avoids the shim entirely.

**6. CSS-module class hashing.** lightningcss and Next hash differently, so class names change. They
are internal, but anything selecting them from outside would break.
*Mitigation:* grep for module class names used outside their component — expected to be zero. The
Phase 1 HTML diff harness catches it structurally, since class names appear in the diff.

**7. TypeScript 7.0.2 (native/Go compiler).** `tsconfig.json` still declares `plugins`
(`typescript-plugin-css-modules`, `next`) and includes `.next/types/**` and `.next/dev/types/**` for
Next's generated route types. Notably, the one build log that got past compilation **failed type
checking** on four errors in `.next/dev/types/validator.ts` — i.e. the current setup is not cleanly
type-checking today.
*Mitigation:* removing Next removes those generated types and those errors. Generate CSS-module `.d.ts`
files in `build.ts` (lightningcss already returns the `exports` map, so this is ten lines) and drop
the tsconfig plugin. Type-check as a separate `tsc --noEmit` step, not in the build's critical path.

**8. bun versus node in the Vercel build image.** The image is Amazon Linux 2023 with Node 24/22/20.
`bunVersion` exists as a `vercel.ts` option, but the safe path is not to depend on it.
*Mitigation:* keep `build.ts` free of bun-only APIs — no `Bun.file`, no `Bun.serve` outside the dev
server — so `node --experimental-strip-types build.ts` works. Use bun locally, node on Vercel, and
verify with `vercel build` in Phase 4. Also: **do not override the Install Command with a bare
`pnpm install`** — Vercel then uses the *oldest* pnpm in the container, which is pnpm 6.

**9. `MinecraftInventoryFromDir`.** Walks `app/components/mc/images/` at render time and base64-inlines
**53 PNGs** into one page's HTML, with a byte-identical duplicate set sitting in `public/mc/images/`.
*Mitigation:* stop inlining. Emit `<img src="/mc/images/...">` against the copies already in
`public/`, which also lets `/_vercel/image` serve them. Delete the duplicate set under `app/`. This
should visibly shrink that one page; measure it in Phase 2.

**10. Vercel auto-detecting Next.js.** `matchPackage: 'next'` is a bare dependency match — as long as
`next` is anywhere in `package.json`, `@vercel/next` runs and `.vercel/output` is never read.
*Mitigation:* all three of `"framework": null` in `vercel.json`, Framework Preset = **Other** in
project settings, and removing `next` from `package.json` at cutover. Any two of the three is not
enough to be comfortable.

**11. `?embed=true` and the iframe windows.** The homepage mounts `<iframe src={href + '?embed=true'}>`
per open post, plus a hidden preload iframe on hover.
*Mitigation:* the two-variant output in §3.3, with a `has: [{type:'query', key:'embed'}]` route for
back-compat. Verify the hidden preload iframe and the visible one both resolve, and that the embed
variant has no toolbar in the DOM at all rather than a hidden one.

**12. Analytics custom events.** Four `track()` calls (`nav_click`, `blog_click`, `project_click`,
`nav_click` with `source:'widget'`) sit in components that are `'use client'` *solely* to call
`track()`.
*Mitigation:* `import { track } from '@vercel/analytics'` — the bare root export is framework-agnostic
and works from the desktop island. For the two widgets, `track()` on a delegated click handler in the
runtime, keyed off a `data-track` attribute, so they need no island at all. Verify all four event
names appear in the dashboard in Phase 4 — names are strings and a typo is silent.

**13. SEO regressions.** Canonical, OG, Twitter card, sitemap, feed, robots and the
`%s | Max Leiter` title template are all currently produced by Next's metadata system.
*Mitigation:* Phase 0 snapshots every page's `<head>`; Phase 1's diff harness compares tag-by-tag.
Also keep serving `public/googlef5eb9326a4e9b6e8.html` (Search Console verification) and preserve all
four 308 redirects — feed readers depend on `/atom`, `/feed` and `/rss`.

**14. KnightOS emulator assets.** RequireJS, ROMs, z80e/scas/kpack asm.js blobs, OpenTI webui — the
largest thing in `public/` by far.
*Mitigation:* copy `public/` verbatim. It is already framework-independent; the React wrapper is the
only coupled part and it is ~30 lines. Note `public/knightos/main.js` XHRs
`packages.knightos.org` **directly**, so `app/api/knightos-package/` is dead and should be deleted
rather than ported.

---

## 7. Migration plan

Estimates are for an expert working with an AI pair. Every phase ends in something verifiable.

### Phase −1 — The framework-independent fixes (2.5 h) — do this even if you stop here

§9.1 optimize `ladybird.png`, §9.2 subset the fonts, §9.4 prerender the per-post OG images and read
them from local files, §9.5 filter `published: false` out of the feed. All four land on the current
Next site and all four carry across unchanged.

*Gate:* homepage transfer drops from 1,277,773 B to roughly 500,000 B; mobile Lighthouse on `/`
rises from 92; the feed contains 23 posts and 8 notes, not 42 items.

### Phase 0 — Baseline snapshot (2 h)

`02-perf-baseline.md` already covers the measurement side — per-page wire bytes, chunk
identification, Lighthouse desktop and mobile, and the `pageanalyze.mjs` / `wire.sh` scripts. Re-run
those after Phase −1 to capture the new baseline, then add the piece that report does not have:
`tools/diff-html.ts`, which normalizes (strip `self.__next_f` scripts, sort attributes, collapse
whitespace, drop content hashes) and diffs old HTML against new. Save the HTML of every route.

*Gate:* the harness runs against the current build and reports zero diffs against itself.

### Phase 1 — Build pipeline, zero JS (16 h)

Content reading, MDX compile, shiki, CSS, fonts, the `<head>` builder, page templates for all 8
static routes plus posts and notes, directory output. No islands. No JavaScript at all.

*Gate:* every route emits HTML; the diff harness shows only intended differences; `<head>` tags match
tag-for-tag; all 76 code blocks highlight in both themes; heading anchors and cross-post fragment
links (`/blog/easy-site-improvements#wave`) resolve; the build completes in under 3 s.

### Phase 2 — Islands (12 h)

The 735-byte runtime, the `<Island>` build-time component, the esbuild pipeline with the Preact
alias. Palette, theme toggle, `FileTree`, `ShotGrid`, `MinecraftInventory`. Static `<Diff>` and
static `<Tweet>`.

*Gate:* ⌘K opens and accepts typing before the module loads; arrow keys wrap; Enter navigates;
Escape closes; external results open in a new tab. No theme flash on a throttled reload. Every page
still fully usable with JavaScript disabled. Per-page JS budget: 735 B on content pages.

### Phase 3 — The desktop homepage (16 h)

Port `desktop-client.tsx` and `window.tsx` to Preact. Strip `next/link`, `next/navigation`,
`next/dynamic`. `router.push` → `location.assign`. Toolbar buttons → anchors. Two-variant embed
output. Calculator as a vanilla island.

*Gate:* open, close, focus/z-order, mouse drag, touch drag, corner resize, viewport clamping, the
20 px edge snap with live preview and pre-snap restore, Ctrl+W, `?openPost=<slug>` deep link with
`replaceState` scrub, and the sub-768px mobile divergence where cards navigate instead of opening
windows. Test on a real touch device.

### Phase 4 — Platform (8 h)

OG images, sitemap, feed, robots, search-index, redirects, `.vercel/output/config.json`, image
`srcset`. `vercel build && vercel deploy --prebuilt` to a preview URL.

*Gate:* all four 308s resolve; feed validates and contains **no** `published:false` items; sitemap
covers all 8 top-level pages plus posts and notes; per-post OG PNGs are 1200×630 and read from local
files; `/_vercel/image` returns AVIF to a browser that accepts it; `/blog/<slug>/embed` renders
chrome-free; all four analytics events fire.

### Phase 5 — Cutover (4 h)

Remove `next`, `next-mdx-remote`, `bright`, `next-themes`, `react-diff-viewer` from
`package.json`. Framework Preset → Other. Delete the dead files report 01 lists:
`app/components/post/navigation.tsx`, `app/data/talks.json`, `app/lib/about-content.ts`,
`app/api/knightos-package/`, `app/styles/syntax.css`, the shadcn variable block, the duplicate
Minecraft image set, and every no-op `3xl:` class.

*Gate:* production deploy; Lighthouse desktop and mobile before/after; crawl every URL in the sitemap
for a 200; check Search Console for new coverage errors after a week.

**Total: 2.5 h for Phase −1, then ~58 hours for the rewrite.** Plan for 55–75 on the rewrite given
the touch-drag work in Phase 3 and the usual long tail. Phase −1 is independently shippable and
should go out this week regardless of what is decided about the rest.

---

## 8. Verdict inputs

Next.js figures are **measured**, from `02-perf-baseline.md`. Bespoke figures are **projected** from
§5. All JS figures exclude the 112,594 B `noModule` core-js chunk, which no ES-module browser
downloads.

| | Next.js 16.4.0-canary.12 (measured) | Bespoke B′ (projected) |
|---|---|---|
| Warm build | **2.36 s** for 46 pages (compile 286 ms, static gen 975 ms) | ~1.5–2.5 s — **a wash** |
| Standalone type check | 0.15 s, **and it fails** on 4 `TS2559` errors in generated route types | 0.15 s, passes |
| Client JS, blog post | **132,796 B br** local / **180,834 B wire** / 12 files | **735 B br / ~1,000 B wire** / 1 file |
| Client JS, homepage | **139,287 B br** local / **167,898 B wire** / 11 files | **27,659 B br / ~33,000 B wire** / 2 files |
| — framework share of that JS | **111,965 B br: 84 % on a post, 80 % on the homepage** | 7,274 B br (preact/compat), on the homepage only |
| — the site's own code | 20,831 B br (post) / 27,322 B br (homepage) | roughly unchanged; that is the point |
| RSC link prefetch per page | **61,420 B** (post) / **164,891 B** (homepage), 7 and 21 requests | **0** |
| HTML, blog post | 157,607 raw / **15,942 br** local / **25,270 B wire** | ~36,900 raw / ~8,000 br / **~9,500 wire** |
| — RSC flight, marginal brotli cost | **3,697 B** (post), 9,022 B (homepage). Raw share is 51–65 % but brotli dedupes it | 0 |
| — inlined CSS | **47,963 raw** on a post that uses no FileTree, ShotGrid or Tweet | **27,853 raw**, page-scoped |
| HTML, homepage | 160,510 raw / 19,726 br / **24,840 B wire** | ~57,200 raw / ~9,000 br / **~10,500 wire** |
| Total wire, blog post, excl. fonts | **267,524 B** | **~10,500 B** |
| Total wire, homepage, excl. fonts and images | **357,629 B** | **~43,500 B** |
| Requests, homepage | **42** (17 script, 21 RSC prefetch, 2 font, 1 image, 1 doc) | **~6** |
| TTFB | 1.1–1.3 ms local; **73–84 ms live**, pure RTT | identical — static file either way |
| Lighthouse `/` | **99 desktop / 92 mobile**; LCP 892 ms / 3,303 ms; TBT 0 / 3 ms | Expect 100 / 96–99. Mobile LCP is dominated by the 754 KB PNG, not by JS |
| Lighthouse `/blog/weights` | **100 desktop / 95 mobile**; TBT 0 / 2 ms | Expect 100 / 99 |
| Unused JS (Lighthouse) | **10–450 bytes.** Next's splitting is already near-perfect | ~0 |
| Main-thread JS execution, homepage mobile | 110 ms, of which **react-dom is 105 ms** | ~10 ms |
| `node_modules` | **541 M**, 538 packages; `next` alone is **200 M** | **119 M, 232 entries** — measured in `spike/`, which holds the real toolchain (shiki, @mdx-js/mdx, esbuild, lightningcss, tailwind, react, preact, the remark/rehype set) but not yet `@vercel/og` or `@vercel/routing-utils` |
| Per-post OG images | **Not prerendered.** No `generateStaticParams`; 436 ms on first request, cached after | Prerendered at build, ~4 ms each |
| Dev server start | **97 ms** | ~50 ms + ~1.5 s first build |
| Dev iteration | HMR + React Fast Refresh, component state preserved | Full reload, ~150–300 ms, **state lost** |
| Framework LOC you own | 0 | **~1,850** (build 250, mdx 250, render 200, islands 150, css 150, client 120, og 120, feeds 150, vercel 120, dev 150, misc 200) |
| Features lost | — | React Fast Refresh; the Next error overlay; typed routes; React Compiler (initially); `next/dynamic`'s automatic server-component splitting (replaced by an explicit island manifest) |
| Features gained | — | Cross-document view transitions **including back/forward**; a genuine no-JS experience; two-variant embed output replacing the DOM-surgery hack; `published:false` no longer leaking into the 263 KB feed; a complete sitemap; prerendered per-post OG images that do not depend on `raw.githubusercontent.com` |

### The honest counter-arguments

1. **Build time is not a reason.** 2.4 s warm for 46 pages. The projected bespoke build is the same.
   I claimed a 2–4× build win before reading the baseline; that claim was wrong.
2. **Serving is not a reason.** 73–84 ms live TTFB is round-trip time to `sfo1`. A hand-rolled static
   file is served by the same CDN with the same latency.
3. **HTML size is a small reason.** 12.2–15.9 KB brotli per document is close to the floor. The
   bespoke gain is ~3.6 KB of gzip per post page, and it comes from page-scoped CSS rather than from
   deleting the RSC flight payload, which costs only 3,697 B at the margin.
4. **Lighthouse is already 92–100 with 0–3 ms TBT.** No user is experiencing jank. The mobile gap on
   the homepage (92, LCP 3.3 s) is caused by a 754 KB PNG, and fixing that image needs no rewrite.
5. **Two of the five largest wins are framework-independent** (§9) and one of them is bigger than
   anything the rewrite buys on the homepage.
6. **You will own ~1,850 lines of framework**, needing attention whenever Vercel changes the Build
   Output API or a remark plugin bumps a major. Against that: the site already hand-rolls two
   hydration workarounds, five `next/dynamic` wrapper files, and an RSS script that races the build.
7. **Losing Fast Refresh is a daily cost; shipping 267 KB less per post is a per-visitor cost.**
   Which dominates depends on whether this site is mostly written or mostly read.

### Verdict

The hypothesis holds on **exactly one axis, and holds strongly there**: client JavaScript. 111,965 B
brotli of React and Next runtime plus 61–165 KB of RSC prefetch is 80–84 % of everything shipped,
and on a prose page it does nothing observable. Removing it takes a blog post from ~267 KB of
framework-attributable transfer to ~10 KB, and the homepage from ~358 KB to ~44 KB. That is a real,
large, structural result that no amount of configuration will get from Next.

It does **not** hold on build time, on serving, on HTML size, on code splitting, or on desktop
runtime performance — the baseline shows Next at or near the floor on all five, and my earlier draft
overstated three of them.

So the decision is not "is it faster". It is: **is ~58 hours of work and ~1,850 lines of owned
framework code worth deleting 250 KB of per-visit JavaScript from a site that already scores 92–100
in Lighthouse?** That is a taste-and-principle call, and it is the owner's to make. What can be said
without hedging is that the byte result is real, it is large, and it is measured — and that §9
should be done first regardless, because it is cheaper and, on the homepage, worth more.

---

## 9. Framework-independent wins — do these first, whatever you decide

Four of these are cheaper than any phase in §7 and, on the homepage, two of them are worth more than
the entire rewrite. None of them requires touching Next.js.

### 9.1 The 754 KB PNG — the single largest byte on the site (30 minutes)

`tddeuevmbjbaaeoi.public.blob.vercel-storage.com/blog/xios/ladybird.png` is **754,541 B**, served
straight from Blob storage with no optimization. It is 59 % of the homepage's 1,277,773 B and
**larger than every script on the page combined**. It is also the reason mobile LCP on `/` is
3,303 ms and the mobile Lighthouse score is 92 rather than 98.

The cause is in the code, not the platform: report 01 found that two of the four `next/image` call
sites pass `unoptimized`, so only `MDXImage` and the raw `Image` MDX component actually route
through the optimizer. Whatever renders `ladybird.png` is not one of them.

Fix now, on Next: route it through `next/image` without `unoptimized`, or pre-encode it to AVIF and
re-upload. Expect ~754 KB → ~60–90 KB. **That one change is worth more on the homepage than removing
React.**

### 9.2 Font subsetting (1–2 hours)

Geist Sans Variable and Geist Mono Variable total **116,604 B on every page**, more than all the
JavaScript on a blog post under the bespoke design and roughly the same as all modern JS on a post
under Next. They are variable fonts carrying the full weight axis and a full Latin-plus character
set.

Subset both to the characters actually used (`pyftsubset --unicodes=U+0000-00FF,U+2000-206F,U+2190-21BB`
or similar) and, if the design only uses two or three weights, pin the `wght` axis. Realistic
outcome is 116 KB → 40–60 KB. This carries across unchanged into the bespoke design, where it
becomes the **largest remaining item on a blog post by an order of magnitude** — 117 KB of fonts
against ~10 KB of everything else.

Verify no glyph regressions in the Minecraft post and in code blocks before shipping.

### 9.3 Precompression is not available — plan around it (0 hours, but know it)

The baseline found that Vercel compresses on the fly at a low brotli level: on the react-dom chunk,
its brotli (73,291 B) is **worse than its own gzip** (72,595 B) and 19 % worse than local brotli q11
(61,552 B). That is ~16 % of JS transfer left on the table.

**Shipping precompressed `.br` files does not recover it.** The Build Output API serves files in
`static/` byte-for-byte with no name or content modification, so a `.br` sibling is just an
unreferenced file; and Vercel's own community reports describe pre-compressed assets being
**ignored and re-compressed at the edge**, with a recent regression producing a doubled
`Content-Encoding: br, br` header on assets that were already compressed.

A content-negotiation route in `config.json` — matching `has: [{type: 'header', key:
'accept-encoding', ...}]`, rewriting to `file.br`, and setting `content-encoding: br` — is
theoretically expressible in the route schema, but it fights the same edge re-compression and I
could not verify it works. **UNVERIFIED. Do not build on it.**

The practical consequence favours the rewrite for a reason I did not anticipate: **compression
quality only matters in proportion to how much you ship.** 16 % of 180,834 B of JS is ~29 KB lost to
Vercel's compressor on every blog post today. 16 % of 1,000 B is 160 bytes. The bespoke design makes
this problem disappear by not having enough bytes for it to apply to.

It also argues mildly *against* inlining CSS: an inlined stylesheet is re-compressed with the
document on every request, whereas a hashed `<link>` under `immutable` caching is compressed once and
served from the edge cache. On a first visit inlining still wins (no extra round trip); on a second
page view the link wins. Given single-page-visit-dominated traffic, keep inlining, but this is the
strongest argument for revisiting it.

### 9.4 Prerender the per-post OG images (30 minutes, on Next)

The route table shows `○ /blog/[slug]/opengraph-image-3lcqvo` as Static with **no
`generateStaticParams`**, so each slug is rendered on first request — 436 ms cold for `/blog/weights`
— and cached after. Add `generateStaticParams` to that file and they prerender at build.

While there: it fetches the post source over the network from
`raw.githubusercontent.com/.../master/posts/<slug>.mdx` rather than reading the local file, so a new
post gets a 404 OG card until it is pushed. Read the local file instead. Both fixes are worth making
today and both carry into the bespoke build.

### 9.5 The `published: false` feed leak (15 minutes, on Next)

`scripts/rss.mts` does not filter `published: false`, so all 30 posts and all 12 notes ship in the
262,963 B `feed.xml`, including 11 unpublished ones. This is live content exposure, it is one
`.filter()`, and it should not wait for an architecture decision.

### 9.6 Ranked against the rewrite

| Action | Effort | Homepage bytes saved | Post-page bytes saved |
|---|---|---|---|
| §9.1 optimize `ladybird.png` | 0.5 h | **~670,000** | 0 |
| §9.2 subset fonts | 1–2 h | **~60,000** | **~60,000** |
| §9.4 prerender OG images | 0.5 h | 0 | 0 (latency, not bytes) |
| §9.5 fix the feed leak | 0.25 h | 0 | 0 (correctness) |
| **The full rewrite (§7)** | **~58 h** | ~314,000 | **~257,000** |

On the homepage the image fix alone beats the rewrite. On a blog post the rewrite wins decisively,
but font subsetting delivers a quarter of it for 2 % of the effort. Do §9 first; it also makes the
rewrite's own numbers better, since fonts and images carry across unchanged.

---

## Sources

- [MDN — View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [Chrome for Developers — Cross-document view transitions](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document)
- [MDN — `@view-transition`](https://developer.mozilla.org/en-US/docs/Web/CSS/@view-transition)
- [MDN — `view-transition-name`](https://developer.mozilla.org/docs/Web/CSS/view-transition-name)
- [CSS-Tricks — Cross-Document View Transitions: The Gotchas Nobody Mentions](https://css-tricks.com/cross-document-view-transitions-part-1/)
- [Vercel CDN Compression](https://vercel.com/docs/edge-network/compression)
- [Vercel Community — Vercel not serving pre-compressed assets (brotli)](https://community.vercel.com/t/vercel-not-serving-pre-compressed-assets-brotli/1639)
- [Vercel Community — BREAKING CHANGE: pre-compressed assets re-compressed at the edge](https://community.vercel.com/t/breaking-change-pre-compressed-assets-re-compressed-at-the-edge/18744)
- All Next.js measurements: `02-perf-baseline.md`.
- Vercel Build Output API, image optimization, `@vercel/og`, analytics and build-image details: see
  `03-vercel-build-output-research.md`, which carries the primary citations.
