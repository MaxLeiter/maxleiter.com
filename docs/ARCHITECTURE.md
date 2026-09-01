# Architecture

How this site is built, and the decisions behind it. This is the living
description: if the code and this file disagree, the code is right and this file
is a bug.

## What it is

A bespoke static site generator. There is no web framework and no server. Every
route is rendered to HTML at build time and served as a file. The output is a
[Vercel Build Output API](https://vercel.com/docs/build-output-api/v3)
directory: static files plus a routing table.

78 routes, 4 islands, 12 platform routes, and it builds in about 450 ms. A
content page ships roughly 1 KB of JavaScript. The homepage, which has a
draggable window manager on it, ships about 17 KB brotli, and none of it before
first paint.

`bun run build.ts` is the local path. `node scripts/build.mjs` is what Vercel
runs, and the two produce byte-identical output. Nothing in the build uses a
runtime-specific API outside `framework/dev.ts`.

## Layout

```
build.ts                    the whole build: orders the steps, assembles the
                            stylesheet fragments, writes the HTML
framework/
  dev.ts                    watch, rebuild, serve, live reload (the only file
                            allowed to use Bun.*)
  shared/                   importable by everything, including tools/ and the
                            client bundle. May import nothing but node builtins
                            and React types
    types.ts                the build-side record types
    routing.ts              URL -> file. Redirects, the ?embed rewrite, MIME.
                            One table, read by vercel.ts, dev.ts and the gate
    transitions.ts          transitionName(kind, slug) and its URL inverse
  content/                  everything that reads the repo
    index.ts                posts, notes and projects -> BuildContext
    tweets.ts               committed tweet payloads
    dimensions.ts           committed image sizes
    committed.ts            the mechanism behind "the build makes no network
                            requests": resolve once, commit, read from the repo
  render/                   everything that turns content into markup
    index.ts                the server bundle's entry: the render loop
    pages.ts                the page registry, every route as a PageDef
    shell.tsx               the HTML shell: head tags, inlined CSS, scripts
    islands.tsx             the build-time <Island> marker and its manifest
    mdx.ts                  @mdx-js/mdx compile and run, content-hashed cache
    highlight.ts            shiki, two themes, emitted as CSS custom properties
    images.tsx              <Img>: the /_vercel/image srcset
  assets/                   the three producers of bytes the shell needs
    css.ts                  the Tailwind CLI over app/styles/
    client.ts               esbuild: the runtime and one bundle per island
    fonts.ts                the Geist subsets
    node-bundle.json        the node/ESM esbuild options, as data
  platform/                 the three writers that run in one Promise.all
    index.ts                runPlatformSteps
    og.ts feeds.ts vercel.ts
    test.ts                 the platform check, `pnpm test`
  client/
    runtime.ts              the client runtime, inlined into every page
    router.ts               the same-document router, lazily imported
app/
  pages/                    page components, plain React
  islands/                  the interactive ones
  components/               shared components, server-rendered
  mdx/                      the MDX component maps: static and island halves
  lib/                      the client-safe app layer (see Types)
  styles/                   global.css, markdown.css, the CSS fragments
posts/ notes/               MDX content
public/                     copied verbatim
tools/snapshot.ts           the regression gate
docs/snapshot.json          what the gate compares against
```

Only `content/`, `render/` and `platform/` have an `index.ts`, because only they
have one natural entry point. `assets/` does not: its three functions are called
at three different points in the build timeline.

`app/` reaches into the framework through the `@framework/*` path alias, so its
imports do not encode directory depth. Inside `framework/` the imports stay
relative, and `tools/` keeps relative specifiers with explicit `.ts` extensions
because it runs unbundled, where a tsconfig alias is not guaranteed to resolve.

## The build

`build.ts` runs these steps. The independent ones overlap, which is why the
per-step times in the report do not sum to the total.

1. **content** — `content/index.ts` reads `posts/` and `notes/` with
   gray-matter, drops anything `published: false`, sorts by date. That plus the
   project list is the `BuildContext` every later step receives.

2. **server bundle** — esbuild bundles `render/index.ts` and everything it
   imports into one module at `.cache/server/entry.mjs`, then `build.ts`
   imports it. Path aliases, JSX and react-tweet's CSS modules all resolve
   here, once. This is why bun and node produce identical bytes: nothing is
   resolved by a runtime loader.

3. **render** — every `PageDef` is rendered to a body string with
   `renderToStaticMarkup`. Bodies come first because rendering them is what
   registers island names and mints the shiki style classes; only then can the
   stylesheet and the client bundles be built.

4. **css** — the Tailwind CLI runs over `app/styles/global.css` as a child
   process, in parallel with rendering. Its output is the base sheet, inlined
   into every page.

5. **client bundle** — esbuild, one entry per island plus the runtime, with
   `react`/`react-dom` aliased to `preact/compat`, code-split and content-hashed
   into `/_assets/`.

6. **css fragments** — each conditional slice of the stylesheet is read,
   minified, and given the markup marker that proves a page needs it.

7. **write html** — each page gets the base sheet plus only the fragments its
   markup references, wrapped in the shell. Written twice: `index.html` and
   `index.partial.html`. The route manifest goes to
   `.vercel/output/routes.json`, beside `static/` so it is never served.

8. **platform** — `platform/index.ts` runs the OG images, the feed, sitemap,
   robots, search index and `config.json` in one `Promise.all`, because they
   write disjoint files, while `public/` is copied. A failure here is fatal on purpose: a build with no feed
   and no routing table should not exit zero.

9. **publish output** — the finished tree is renamed into `.vercel/output`. The
   build works in a scratch directory named after its own pid, so a failed build
   leaves the previous good output alone and two builds at once cannot corrupt
   each other.

Fonts are prepared once, by `build.ts` itself, before any page is written,
because the shell needs their `@font-face` CSS. That is why they sit in
`assets/` with the other two producers rather than in `platform/`: they are not
an exception to the platform step, they are a different kind of thing. The
prepared result is passed to `runPlatformSteps` so the log line can report it.
Preparing them in two places re-read, re-hashed and rewrote both woff2 files on
every build.

## CSS

One base sheet inlined into every `<head>`, plus the conditional fragments that
page needs. Two `<style>` tags, not one: `#css-base` is byte-identical on every
page and a soft navigation never touches it, while `#css-page` is that route's
fragments and is all a swap replaces.

Every fragment is a plain stylesheet whose scoping is written into the class
names — `.tree-`, `.shot-`, `.mc-`, `.mdx-note`, `.rt-` — and `PLAIN_SHEETS` in
`build.ts` pairs each with the marker that gates it. The markers are
attribute-shaped (`class="shiki`, not `shiki`) because a bare word matches
prose, and because `.react-tweet-theme` appears in the base sheet as a
first-party override.

Gating is worth a measured median 3.5 KB brotli per page, so it stays. There
used to be a CSS-module compiler under it that derived the markers from
lightningcss's generated hashes; that is gone. See the decisions log.

react-tweet is the one package that still ships CSS modules. Its styling is
pre-scoped into `app/styles/fragments/react-tweet.css` by
`scripts/react-tweet-css.ts`, and a small esbuild plugin in `build.ts` hands
its components the same `.rt-<module>-<class>` names. Rerun that script when the
react-tweet version changes.

## Islands

Pages are plain React rendered to static markup. Anything interactive is an
island: `<Island name="x" on="visible" props={...}>` emits a `data-island`
wrapper around server-rendered fallback markup, and `client/runtime.ts` hydrates
it with Preact.

Two triggers. `load` mounts after first paint, `visible` when the island nears
the viewport through one shared `IntersectionObserver` at `rootMargin: 200px`.
An island with no trigger is mounted by name instead; the command palette is the
only one, because it renders `hidden` and `openPalette()` in the runtime unhides
and mounts it on Cmd/Ctrl+K or a `[data-open-palette]` click.

- Island sources live in `app/islands/<name>.tsx` with a default export, and
  must render markup identical to their fallback on first render.
- The hydrate wrapper that owns the `hydrateRoot` call is a virtual esbuild
  entry (`island:<name>`), which is what keeps preact out of the runtime.
- A real fallback is preferred, because it is what makes the page work with
  JavaScript off. An empty fallback is correct only where the island adds a
  control surface rather than reproducing markup: the shot grid renders just a
  `<dialog>`, and it is a *sibling* of the server-rendered grid on purpose. An
  island wrapping that grid would have to reproduce the image optimizer's
  `<img>` markup exactly or preact would destroy it on hydration.
- Islands take class names as literals from their own pre-scoped stylesheet, not
  as props. They used to be passed through `data-props` because the client
  bundle had no CSS-module plugin and would have minted different hashes.
- The runtime also owns, with no island: the theme toggle, Cmd/Ctrl+K, delegated
  `[data-track]` analytics, and outgoing view-transition names. For
  `[data-track]`, `data-track` is the event *name* and every other data
  attribute becomes a payload key, camelCased by the dataset API: write
  `data-section`, not `data-track-section`. `data-vt-name` is excluded from that
  payload because it is the transition opt-in.
- The menubar clock is not the runtime's. `#menubar-clock` exists only on the
  homepage, where the desktop island hydrates over it and owns it; a second
  interval writing `textContent` behind preact's back is one owner too many.
- View-transition names have a single owner: the runtime's `pageswap` handler.
  Elements opt in with `data-vt-name`, it names at most one of them, and it
  stands down when something already holds that name as a live inline style,
  which is how an open post window wins over the card behind it. Two elements
  holding one name cancels the transition outright, so this cannot be two
  listeners racing on registration order. The name comes from
  `transitionName(kind, slug)` in `framework/shared/transitions.ts`, never from
  a string spelled out at a call site.

## Navigation

Instant navigation has two paths, chosen by capability detection at runtime
start. **Never user-agent sniffing** — no `navigator.userAgent`, `platform`,
`vendor` or brand string appears anywhere in `framework/` or `app/`.

The native path requires all three of `HTMLScriptElement.supports('speculationrules')`,
`'prerendering' in document` and `'PageRevealEvent' in window`. The middle check
is load-bearing rather than belt-and-braces: **WebKit hardcodes
`supports('speculationrules')` to true** for its prefetch-only support, so on
that check alone iOS Safari claimed the native path, never installed the router,
and showed its loading bar on every navigation. `document.prerendering` is the
property the prerendering spec actually defines, and WebKit does not have it.

- **Native** (Chrome, Edge today): every page carries a
  `<script type="speculationrules">` that prerenders same-origin documents at
  `eagerness: "moderate"`, and `@view-transition` animates the cross-document
  navigation. The router is not installed and its chunk is never downloaded.
  This path is strictly better, because the next document is fully rendered
  before the click.
- **Router** (everything else): `runtime.ts` lazily imports `client/router.ts`,
  which intercepts same-origin clicks and swaps the document in place. That
  removes the loading indicator and the mobile blank flash. Keep it a lazy
  import: a static one would put it in the inline runtime on every page,
  including every page that will never use it.

Because that import is lazy, there is a window where a click would still be a
real navigation. On the non-native path the runtime registers one capture-phase
click listener immediately, which holds an eligible link, and hands it to
`navigate()` the moment the chunk resolves. Its eligibility rules are the
conservative half of the router's own `routableLink`: anything it misses stays a
real navigation, which is where it would have gone anyway. If the import fails
the held href is assigned to `location`, so a click is never simply lost.

A link is handled only if it is same-origin, primary-button, modifier-free, has
no `target`, no `download`, no `rel="external"`, is not a pure hash change, and
is not inside `[data-no-router]`. Everything else stays a real browser
navigation, which is what keeps cmd-click and middle-click native.

Every route is emitted twice. `index.partial.html` carries only what a swap
replaces: the title, the per-page meta and canonical tags, that route's CSS
fragments, its `#__islands` JSON and its body. The router asks for the partial by
convention and falls back to the full document if it 404s, so an older deploy
still navigates correctly.

Executable scripts are stripped from the fetched document before it is adopted:
the runtime is already running, the theme script has already applied, and
re-running either would double every listener. `<script type="application/json">`
survives, because `#__islands` is data. `<html data-theme>` is never touched by a
swap, because it is viewer state rather than page content.

Islands are unmounted *before* the body is replaced, and the hydrate wrapper
returns `() => root.unmount()` to make that possible. Islands register listeners
on `window` and `document` that outlive their own DOM, so without this they
accumulate one set per navigation. A dynamic island import that resolves after a
swap is discarded by a generation counter.

Prefetch has three triggers through one promise-keyed cache, so a click consumes
an in-flight request rather than starting a second: hover, `pointerdown`, and
links entering the viewport. All three are skipped when
`navigator.connection.saveData` is set or `effectiveType` is 2g or slow-2g.

**Chrome skips the inbound half of a cross-document view transition when the
destination has an external module script in `<head>`.** An inline module does
not trigger it. That is the actual reason the runtime is inlined into every page
rather than linked, and the reason it has a size budget.

## Output conventions

- Directory output, never extensionless files: `/blog/weights` becomes
  `static/blog/weights/index.html`. `staticPathFor()` in `build/routing.ts` is
  the single implementation of that mapping; the write loop, the dev server and
  the gate all call it.
- A page needing its markup under a second filename declares `aliases` on its
  `PageDef`, and the write loop stays generic. `/404` declares `/404.html`,
  because Vercel's static builder injects an error-phase route to that name
  ahead of ours.
- Embed variants live at `/blog/<slug>/embed`. An embed's canonical URL is the
  page it varies, and it is always `noindex`. A `has: query embed` rewrite keeps
  old `?embed=true` links working, for `/blog/` and `/notes/` only.
- Hashed assets under `static/_assets/<name>.<8-char-hash>.<ext>`, immutable.
- Unhashed root files: `search-index.json`, `feed.xml`, `sitemap.xml`,
  `robots.txt`, `opengraph-image.png`, `blog/<slug>/opengraph-image.png`.
- `public/**` is copied verbatim. `public/feed.xml` is not; `feeds.ts` writes
  the real one.
- Theme: the server renders `<html data-theme="dark" style="color-scheme:dark">`
  and a ~200 B blocking inline script in `<head>` corrects it from
  `localStorage.theme` or `prefers-color-scheme` before first paint.
  `[data-theme='light']` is the light selector everywhere.

## Types

Two files, one source of truth each.

- `framework/shared/types.ts` owns the build-side record types: `BuildContext`,
  `PageDef`, `Head`, `PageHead`, `Post`, `Note`, `Project`, `RouteInfo`. These
  describe records loaded with `node:fs` and gray-matter, but the file itself
  imports nothing, which is the `shared/` rule.
- `app/lib/types.ts` owns the client-safe view types plus `entryHref` and
  `POPULAR_SLUGS`. It lives under `app/lib/` because the desktop island imports
  it, and nothing the client bundle reaches may pull in `node:fs` or
  gray-matter. `window-styles.ts` is there for the same reason.

Anything shared between the build and an island has to be a leaf module. That is
what both `app/lib/` and `framework/shared/` are for; the difference is only
which side owns the concept.

`Head` deliberately has no `canonical` field. The canonical URL is always the
route's own path against `ctx.site.url`, so `render/index.ts` derives it once
rather than every `PageDef` restating its own path as a string. `PageHead` is
`Head` plus the canonical the build resolved.

## Platform

`.vercel/output/config.json` carries the redirects, the embed rewrite, the
immutable `_assets` headers, the `_assets` 404 no-store guard, the `handle:
error` route to `/404`, and the `images` block that enables `/_vercel/image`.
All of it is generated: the routing rules come from `build/routing.ts` and the
image widths and quality from `render/images.tsx`, so nothing here restates a
number another module owns. A width in a `srcset` that is missing from
`images.sizes` 400s in production only, which is not a failure a comment can
prevent.

Two traps worth keeping written down:

- **`remotePatterns` are regexes, not globs.** `vercel.ts` has the comment; it
  is the best one in the repo.
- **Route order matters,** and `handle: filesystem` is the divider between the
  rules that run before the file lookup and the ones that run after.

`framework/platform/vercel.ts` also writes the repo-root `vercel.json` on every
build, so a hand edit to that file is silently reverted. It pins three things
that override the project dashboard per deployment: `framework: null`, an
explicit `npx --yes pnpm@9.15.9 install --frozen-lockfile --prod=false`, and
`node scripts/build.mjs`. `--prod=false` is load-bearing: the site is static
output, so every package the build needs is a devDependency, and pnpm reads
`NODE_ENV=production` as an implicit `--prod`. The pinned pnpm version is
load-bearing too, because a bare `pnpm install` in the dashboard makes the build
container pick the oldest pnpm it has, which is pnpm 6.

**The build launcher stays node, not bun.** `bun` is not on `PATH` in the Vercel
build image. `packages/build-utils/src/fs/run-user-scripts.ts` in `vercel/vercel`
prepends `/bun1` to `PATH` only when the detected package manager *is* bun, and
its resolution order puts `pnpm-lock.yaml` ahead of a bare `bun.lock`, so
committing one changes nothing. `scripts/build.mjs` is 31 lines and also solves a
problem bun would not: node cannot resolve the extension-less imports and `.tsx`
files in the graph.

No environment variables. The build makes no network requests and reads no
secrets. `PORT` overrides the dev server's 3000.

## The gate

`pnpm gate` builds, then compares the fresh output against `docs/snapshot.json`:
one row per route with its title, description, canonical, OG image and noindex
flag in plaintext, plus hashes of the visible prose and the code blocks, plus
the size of the soft-navigation partial. The theme script is pinned by content
hash.

- A route the build no longer emits is **fatal**.
- Any changed field or hash is **fatal**, with a per-route diff.
- A new route is **informational**. Publishing a post adds routes, and a gate
  that fails on new content is a gate nobody can keep green.
- A document in the output that the route manifest never declared is **fatal**.
  Files copied from `public/` are subtracted first.

To accept an intended change, run `pnpm snapshot` and review the diff. It should
read like prose; if it does not, that is the signal.

`pnpm test` runs `framework/platform/test.ts` with `bun run`, **not** `bun
test`: the file registers no `bun:test` cases, so the test runner reports "Ran 0
tests" and swallows the failure it signals through `process.exitCode`. It checks
the things a build alone cannot — that a rebuild of the feed, sitemap and search
index is byte-identical (the `rss` package clock-stamps `lastBuildDate`), that
the OG PNGs really are 1200x630, that the font subsets actually shrank, and that
`vercel.json` still pins the install command.

## Decisions

Still-true decisions, newest first. A decision that stops being true should be
deleted from this list rather than annotated.

**The native-navigation gate requires `'prerendering' in document`.** See
Navigation. Confirmed at WebKit source level, and on device.

**`framework/` is laid out by build stage:** `shared/`, `content/`, `render/`,
`assets/`, `platform/`, `client/`. The names say when a module runs, so a file's
folder answers "what depends on this" before you open it. `shared/` carries the
strongest rule in the repo, stated in a docblock at the top of each of its three
files: nothing there may import anything but node builtins and React types,
which is what lets the build, the client bundle and `tools/` all reach it.
oxlint has no `no-restricted-imports`, so the docblocks are the enforcement.

**`app/` reaches the framework through `@framework/*`.** Its imports stop
encoding directory depth. `framework/` stays relative internally, and `tools/`
stays relative with explicit `.ts` extensions because it runs unbundled.

**CSS modules are gone.** Each of the five first-party `*.module.css` files is
now a plain sheet with hand-scoped class names, imported as literals. That
deleted `lightningcss`, the `.d.ts` generator, the "is every rule anchored to
one of this module's own classes" scanner, and the class maps the islands were
receiving through `data-props`. react-tweet's modules are pre-scoped by a script
into one committed sheet. Fragment gating, which is the part that earns its
keep, is unchanged.

**The parity harness is retired.** It diffed the output against a committed copy
of the old Next build, which was deleted and cannot be regenerated, and 20 of
its 26 ignore rules said some version of "the new build is correct and the
baseline was wrong". 2,200 lines became one ~300-line file that compares the
build against the last output that was accepted. Three things were carried
across: the pinned theme-script hash, the undeclared-document check, and the OG
dimension assertion, which lives in the platform test.

**Island triggers are `load` and `visible`.** `idle` was the declared default
that no call site ever asked for, and `interaction` was used by exactly one
island — the command palette — which renders `hidden`, where a `pointerdown` or
`focusin` listener can never fire. The palette's real path in was always
`openPalette()`, and it is now the documented one.

**`load` islands mount after first paint,** through
`requestAnimationFrame` then `setTimeout(0)`. The runtime is an inline module,
so it runs before the browser has painted; starting the desktop's 48 KB import
there put all of it on the homepage's critical path, for an island whose markup
is already server-rendered and already reads as links.

**Fonts are subset to what the site renders and instanced to 400-700.** The
subset used to name eight whole Unicode blocks, 1,208 codepoints, of which Geist
covers 262; it is now Latin-1 plus 35 explicit codepoints, which is the union of
everything above U+00FF in the built output and in the sources that mint text at
runtime. The weight axis is clamped to the three weights the CSS asks for. Both
faces are preloaded on every page, so this is the largest single item on a first
visit: 64.3 KB to 40.4 KB.

**Tailwind's preflight is trimmed, not disabled.** `app/styles/global.css`
carries the two thirds of it the site has elements for. The rest — every
date/time input pseudo-element, `optgroup`, `progress`, `textarea`, the Firefox
`:invalid` fixes — is gone, for about 500 B brotli off every page. That block is
the one file that has to be rechecked on a Tailwind major upgrade.

**The image ladder is `[640, 828, 1536, 1920]` and `sizes` is
`(max-width: 816px) calc(100vw - 48px), 768px`.** The article column is
`max-w-3xl` = 768px inside `p-6`, so the old `700px` understated desktop by 68px
and a DPR-2 desktop screen — the modal visitor — was served the 1920 candidate
for a 1536-pixel need.

**Canonical URLs are derived, not declared.** See Types.

**Titles:** posts and notes both render `<title> | Max Leiter`. Index and static
page titles are unchanged. **Descriptions:** a post with no description emits no
description tags at all; a note without one falls back to the section
description, never the site default.

**Image preloads:** React 19's automatic `<link rel=preload as=image>` is
dropped. The first `<Img>` in an article renders eager with
`fetchpriority="high"`; the rest are lazy.

**Tweets are rendered at build** from committed JSON in
`app/data/tweets/<id>.json`. A missing cache or a failed fetch fails the build,
because a degraded tweet card would ship unnoticed. Image dimensions are
committed the same way but only warn, because `<Img>` falls back to a guess.
Both go through `build/committed.ts`, where the difference is an argument rather
than two hand-written loops that happen to differ.

**Extension-less imports everywhere under `framework/` and `app/`.** `tools/`
may use `.ts` extensions, because it runs unbundled.

**The node/ESM esbuild options are data** (`framework/assets/node-bundle.json`),
read by both `build.ts` and `scripts/build.mjs`. The launcher is plain JS run
straight by node, so it cannot import a `.ts` factory without the very type
stripping it exists to avoid; the two copies had already drifted to different
targets.

**The build-time size report is inside a timed step** and compresses at brotli
quality 5. It used to run after `total` was computed, so a quarter of the
build's cost appeared in no table at all.

**`--breakpoint-3xl: 120rem` is defined in an `@theme` block** in `global.css`.
The ~21 surviving `3xl:` classes in the desktop chrome were no-ops without it.

### Open

The Vercel project dashboard was last seen carrying framework "nextjs",
installCommand "pnpm install" and node 22.x. `vercel.json` overrides all three
per deployment, so deploys are correct, but the dashboard should be flipped to
"Other" with auto-detected install so the override stops being load-bearing.

## History

This site was a Next.js app until August 2026. The rewrite was scoped in four
reports — a feature inventory, a performance baseline, Vercel Build Output API
research, and an architecture design — plus a contract that the agents doing the
work held themselves to. They were added in commit `eb5cec7` and deleted once
the migration finished; `git show eb5cec7` still has them. Next.js itself was
removed in `627c4e7`.

Everything in those documents that is still true is in this file. The rest was
either a description of a codebase that no longer exists, a process note for a
migration that is over, or a dated changelog of work that is now just the shape
of the code.
