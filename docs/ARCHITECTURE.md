# Architecture

How this site is built, and the decisions behind it. This is the living
description: if the code and this file disagree, the code is right and this file
is a bug.

## What it is

A bespoke static site generator. There is no web framework and no server. Every
route is rendered to HTML at build time and served as a file. The output is a
[Vercel Build Output API](https://vercel.com/docs/build-output-api/v3)
directory: static files plus a routing table.

82 routes, 5 islands, 13 platform routes, and it builds in about 350 ms. A
content page ships roughly 1 KB of JavaScript. The homepage, a 2005-style
"blades" dashboard, loads an 11 KB brotli island after first paint and a
1.7 KB background renderer after that; sound is another 1.3 KB, fetched only
when the visitor turns it on.

Every page wears the same theme. Each section is one of five glossy blades --
projects, blog, notes, work and system -- and its colour carries through to its
section page and its articles. The homepage is the dashboard itself, a section
page is one blade open with the other four filed beside it, and an article is
the dashboard's glass reader.

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
    html.ts                 decodeEntities, shared by the CSS pruner and the gate
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
  islands/                  the interactive ones; blades.ts is the dashboard
  components/               shared components, server-rendered
    blades/                 the theme: chrome, dashboard, blade page, reader
  mdx/                      the MDX component maps: static and island halves
  lib/                      the client-safe app layer (see Types)
    blades/                 blade colours, item model, procedural art
  styles/                   global.css, markdown.css, blades.css, fragments/
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

4. **css** — the Tailwind CLI runs once over `app/styles/global.css` as a
   child process, in parallel with rendering. Its output is every rule that
   might ship; step 6 decides which do, and where.

5. **client bundle** — esbuild, one entry per island plus the runtime, with
   `react`/`react-dom` aliased to `preact/compat`, code-split and content-hashed
   into `/_assets/`.

6. **css fragments** — each conditional slice of the stylesheet is read and
   minified, every sheet is pruned against the classes the build emits, the
   rules only the homepage can use are subtracted from the base sheet into a
   fragment of their own, and each fragment is given the markup marker that
   proves a page needs it.

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

Every sheet, base and fragments alike, is pruned against the output
(`pruneCss` in `assets/css.ts`). The build collects every class it can emit —
class attributes, island `data-props`, and the string literals of the client
bundles, which is where the classes islands and the router add at runtime
live — and every custom property its bodies and scripts name. It drops each
selector that needs a class outside that set, then each custom property that
no remaining rule reads and the output never names. Dead CSS comes from two
places, and neither is visible from the sources. Tailwind mints a utility for
any source token that names one, comments and object keys included: esbuild's
`{ filter: /.../ }` is `.filter`, "route table" is `.table`, "the build
container" is `.container`. And hand-written rules outlive the markup they
styled: react-tweet's quoted-tweet and video rules on a site with neither,
seventeen variables in `global.css` nothing reads. The build log lists what
each sheet lost, minus Tailwind's own `--tw-*` variables.

The sheets are pruned together, not one at a time, because a variable crosses
sheets: the homepage fragment's rules read `@property` registrations
(`--bg-a`, `--orb-rot`) that live in the base sheet, and dropping a
registration changes the variable's initial value and whether it inherits.
Classes inside `:not()`, `:is()` and `:where()` never count against a
selector, which errs toward keeping.

The base sheet is the pruned Tailwind build minus what only the homepage can
use, and that difference is decided from the output too (`assembleSheets` in
`build.ts`). The sheet is pruned a second time against everything but the
homepage: the bodies without its `data-island="blades"` marker, and only the
client files some other entry can load, following static and lazy imports.
That second view is the base sheet. What it lost, subtracted from the first by
atom (`subtractCss`), is the `blades` fragment, so only the homepage pays for
the dashboard. `app/styles/blades.css` is imported by `global.css` for exactly
this reason: the dashboard's rules need no gate of their own. Two details
carry the weight. Reachability, not the entry file: esbuild's metafile lists
every lazily imported chunk (the dashboard's ambient background and
synthesizer) as an entry point, so only the entries the build declared count
as roots. And atoms, not blocks: a grouped selector can lose one member and a
`:root` block one variable, so the subtraction compares one declaration plus
the headers above it, which is why `.a,.b{d}` is split into `.a{d}.b{d}`. The
homepage half keeps the full sheet's order within itself, but it lands after
the whole base sheet, so a homepage element carrying a homepage-only rule and
a shared responsive variant of the same property resolves in the fragment's
favour; the visual comparison over the homepage is what catches that.

Every fragment is a plain stylesheet whose scoping is written into the class
names — `.tree-`, `.shot-`, `.mc-`, `.mdx-note`, `.rt-`, `.reader-`,
`.page-blade`, `.blade-surface` — and `PLAIN_SHEETS` in `build.ts` pairs each
with the marker that gates it. The theme is three of them plus the base sheet:
`blades.css` (the chrome every page has, and the dashboard, subtracted as
above), `fragments/blade-common.css` (the blade glass, titles, buttons and
profile card the dashboard and the section pages share), `blade-page.css`
(a section page) and `reader.css` (the article reader). The markers are
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
- A *plain* island is `app/islands/<name>.ts` with no `.tsx` beside it: its
  default export is already `mount(el, props) => teardown`, the virtual entry
  re-exports it, and no preact is bundled. The homepage dashboard
  (`blades.ts`) is the one, because it renders nothing: it takes over markup
  the build already rendered, and a component framework would be pure weight.
- A real fallback is preferred, because it is what makes the page work with
  JavaScript off. An empty fallback is correct only where the island adds a
  control surface rather than reproducing markup: the shot grid renders just a
  `<dialog>`, and it is a *sibling* of the server-rendered grid on purpose. An
  island wrapping that grid would have to reproduce the image optimizer's
  `<img>` markup exactly or preact would destroy it on hydration. The
  dashboard is the same shape at page scale: `Dashboard` renders the complete
  at-rest page, every row a real link, and the empty `blades` island beside it
  finds that markup by id, adds the listbox and tablist roles, and animates it.
- Islands take class names as literals from their own pre-scoped stylesheet, not
  as props. They used to be passed through `data-props` because the client
  bundle had no CSS-module plugin and would have minted different hashes.
- The runtime also owns, with no island: the theme toggle, Cmd/Ctrl+K, Esc
  following a page's `[data-esc]` link (the reader's Back, a section's way to
  the dashboard), delegated `[data-track]` analytics, and the lazy import of
  the router. For
  `[data-track]`, `data-track` is the event *name* and every other data
  attribute becomes a payload key, camelCased by the dataset API: write
  `data-section`, not `data-track-section`. `data-vt-name` is excluded from that
  payload because it is the transition opt-in.
- The dashboard clock is not the runtime's. `#clock` exists only on the
  homepage, where an inline script writes it before first paint and the
  `blades` island owns it once mounted; a second interval is one owner too
  many.
- View-transition names have a single owner: the router's click handler.
  Elements opt in with `data-vt-name`, it names the one that was clicked, and
  it stands down when something already holds that name as a live inline
  style. Two elements holding one name cancels the transition outright. The
  dashboard's preview pane carries its selected article's name, and the
  island opens an article through the pane's Read button rather than the row,
  so the brushed glass is what morphs into the reader. The name comes from
  `transitionName(kind, slug)` in `framework/shared/transitions.ts`, never from
  a string spelled out at a call site.

## The theme

Three page shapes, all in `app/components/blades/`, all server-rendered from
the real `BuildContext`.

- **The dashboard** (`/`, `dashboard.tsx`). Five blades, filed like binder
  pages, each a section: projects, blog (the open one), notes, work (posts on
  the Vercel blog) and system (about, labs, talks, links, settings). Every
  row is a real link, and CSS alone places the blades where the spring
  settles (`.blade[data-pos]`), so the page is complete at rest and with
  JavaScript off: the blade edges and the phone tabs link to the section
  pages, and only the open blade's body is visible or tabbable. The `blades`
  island then adds the swing (one spring position mapped onto every blade's
  translate, hinge and shade), hover selection, touch drag with momentum, the
  wheel, the keyboard, a gamepad, the guide (a modal `<dialog>`), the toasts,
  the live-region announcements and the in-page settings. It keeps the open
  blade in the address bar as `/?blade=notes`; `?item=<slug>` selects a row,
  which is where an article's Back returns to. The ambient background runs in
  a worker on an OffscreenCanvas, built from the module's own function
  source; WebAudio is synthesized, muted until asked for, and loaded then.
- **A section page** (`blade-page.tsx`). One blade open in its colour, the
  other four filed beside it as sticky edges that link to their sections.
  No JavaScript of its own.
- **An article** (`reader.tsx`). The dashboard's glass reader: a header in the
  section's colour over the item's ribbons, then the post on brushed glass,
  rendered through the normal MDX pipeline. The glass follows the reading
  theme (white in light, graphite in dark) because every MDX component sheet
  is themed against `data-theme`; inside it the site's colour variables are
  set again, so those sheets read the glass they are on.

A blade's colours come from one table, `app/lib/blades/theme.ts`, and reach a
page as inline custom properties on its `.bl-root`, so no per-blade class
exists in any sheet. Controls only script can drive carry `js-only`, hidden
until a one-line head script marks `<html class="js">` before first paint.

## Navigation

Every browser gets the same router. `runtime.ts` lazily imports
`client/router.ts`, which intercepts same-origin clicks, fetches the
destination's partial and swaps the document in place under
`document.startViewTransition`. Keep it a lazy import: a static one would put it
in the inline runtime on every page. **Never user-agent sniffing** — no
`navigator.userAgent`, `platform`, `vendor` or brand string appears anywhere in
`framework/` or `app/`.

An earlier version had a second, native path for Chrome and Edge: a
`<script type="speculationrules">` prerendered links on hover and
`@view-transition{navigation:auto}` animated the cross-document navigation, with
the router installed only where those were missing. It was removed because
every link re-fetched the full document (inlined CSS and runtime included, 10 to
15 KB compressed against the partial's 3 KB), and because its failure mode was a
plain hard navigation whenever prerender did not fire: a click inside the hover
delay, touch input, Chrome's prerender budget. Two things learned on that path
are worth keeping in mind if it is ever revisited: WebKit hardcodes
`HTMLScriptElement.supports('speculationrules')` to true for prefetch-only
support, so `'prerendering' in document` is the check that actually separates
prerender-capable browsers; and Chrome skips the inbound half of a
cross-document view transition when the destination has an external module
script in `<head>`.

Because that import is lazy, there is a window where a click would still be a
real navigation. The runtime registers one capture-phase
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
and `application/ld+json` survive, because `#__islands` and `#jsonld` are data.
`<html data-theme>` and `<meta name="theme-color">` are never touched by a
swap, because they are viewer state rather than page content.

Reduced motion skips `startViewTransition` entirely rather than animating
at zero duration: the system setting, or the dashboard's own Motion setting,
which marks `<html class="rm">` for the rest of the visit.

The router owns scroll and focus. `history.scrollRestoration` is `manual`:
left on `auto`, the browser restores on popstate immediately, against the old
page's height, and fights the offset the router stashes in `history.state`. A
fresh navigation scrolls to the URL's `#fragment` target when it has one and
the top otherwise; a history replay restores its saved offset. After every
swap the new `<main>` takes focus (`tabindex="-1"`, `preventScroll`), which
resumes keyboard order on the new page and makes screen readers announce it.
The newest navigation wins: a call that finds a fresher sequence number
returns instead of swapping, because a guard that simply dropped the second
call also dropped popstate and left the address bar disagreeing with the page.

Deploy skew: every document and partial carries `<meta name="shell-id">`, a
hash of exactly what a partial does not re-send -- the inlined runtime, the
base sheet and the font CSS. The router hard-navigates when the fetched
document's id differs from the running page's, so a partial from a newer
deploy is never swapped under an older shell. The hash is content-derived,
not a build stamp, so a content-only deploy keeps soft navigation intact.
The prefetch cache expires entries after five minutes for the same reason:
it exists to bridge a hover and its click, not to keep a long-lived tab on
yesterday's page.

Islands are unmounted *before* the body is replaced, and the hydrate wrapper
returns `() => root.unmount()` to make that possible. Islands register listeners
on `window` and `document` that outlive their own DOM, so without this they
accumulate one set per navigation. A dynamic island import that resolves after a
swap is discarded by a generation counter.

Prefetch has three triggers through one promise-keyed cache, so a click consumes
an in-flight request rather than starting a second: hover, `pointerdown`, and
links entering the viewport. All three are skipped when
`navigator.connection.saveData` is set or `effectiveType` is 2g or slow-2g.

The runtime is inlined into every page so the first page needs no extra request
before links become instant. It rides in every document, which is why it has a
size budget. The router chunk it lazily imports is declared as
`<link rel="modulepreload">` in the head, so its fetch starts at head parse
instead of after the body-end module executes — which shrinks the window where
a fast first click has to ride the `hold` fallback.

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
  `[data-theme='light']` is the light selector everywhere. The script also
  corrects `<meta name="theme-color">` (shipped dark, like the document), and
  the runtime's toggle keeps it in step; the pair of values must match `--bg`
  in `global.css`. The theme decides only the reading glass: the blades chrome
  is dark in both, and `html, body` are a fixed near-black so an overscroll
  never flashes white. The dashboard borrows `theme-color` for the open
  blade's shadow tone while it is up and hands it back in its teardown.

## Types

Two files, one source of truth each.

- `framework/shared/types.ts` owns the build-side record types: `BuildContext`,
  `PageDef`, `Head`, `PageHead`, `Post`, `Note`, `Project`, `RouteInfo`. These
  describe records loaded with `node:fs` and gray-matter, but the file itself
  imports nothing, which is the `shared/` rule.
- `app/lib/types.ts` owns the client-safe view types plus `entryHref` and
  `POPULAR_SLUGS`. It lives under `app/lib/` because nothing the client bundle
  reaches may pull in `node:fs` or gray-matter. `app/lib/blades/` is there for
  the same reason: the blade colours, the dashboard's item model and its
  procedural art are rendered by the build and again by the homepage island,
  so they are string functions in leaf modules. Only `excerpt.ts` is
  build-side in practice, and it is a leaf too.

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
`vercel.json` still pins the install command. It also enforces four source
invariants oxlint cannot express (it has no `no-restricted-imports`): the
`framework/shared/` import rule, no user-agent sniffing anywhere in
`framework/` or `app/`, no `font-variant-*` or `font-feature-settings` in
`app/` asking for an OpenType feature the font subsets dropped, and the inline
runtime's size budget — 1,536 B brotli, against 1,135 B when the budget was
set, so a static import of preact or the router fails the check instead of
quietly riding into every page.

CI (`.github/workflows/ci.yml`) runs `check`, `lint:check` (the `--check` form
of the format pass, because `pnpm lint` rewrites files), `test` and `gate` on
every push and pull request, then builds with bun and node and asserts the two
trees are byte-identical — the determinism claim the whole build rests on,
checked with real hashes instead of stated in prose.

## Decisions

Still-true decisions, newest first. A decision that stops being true should be
deleted from this list rather than annotated.

**The site wears the 2005 "blades" theme, and the window manager is gone.**
October 2026, ported from a standalone prototype. The homepage became the
dashboard, the section pages its open blades, and every article its glass
reader; the routes, titles, descriptions, canonicals, OG images and the feed
are unchanged. Three things were decided on the way. The dashboard is a plain
island over complete server markup, not a preact tree, so the at-rest frame
is the no-JavaScript page and the island ships no component framework. The
heavy parts are separate chunks loaded after the dashboard is interactive (the
background) or on request (sound), never in the inline runtime and never on a
content page. And the reading glass follows `data-theme` rather than always
being the prototype's white, because the MDX components inside it are themed
against that attribute. Content pages cost about 1.7 KB brotli more than the
window-manager site (the reader's chrome and its sheet); the homepage's HTML
roughly doubled, since every blade's rows and their preview text are in it.

**The homepage fragment is derived from the output, not from its sources.** A
hand-kept list of the homepage's source files, fed to a second Tailwind run,
once left out the module holding the shared toolbar's classes and shipped
every content page a toolbar with no height or padding. Reading the split off
the output cannot misfile a file, and it took 3.4 KB raw off every document,
because homepage-only classes outside the listed files used to stay in base.

**Every sheet is pruned against the build's own output.** The first attempt
narrowed Tailwind's sources to the framework stages that emit markup, which
removed four junk utilities, missed the ones minted inside `app/`, and would
silently drop the CSS of any markup that later came from another directory.
Pruning the output catches every source of junk, including hand-written sheets,
and scanning too much now costs nothing. It took 5.4 KB raw and about 0.58 KB
brotli off every document, and 4.3 KB of react-tweet rules and variables for
quoted tweets and video the site's tweets never use.

**OG and Twitter cards carry the page's own title and URL.** The Next site
emitted the constant site name as `og:title` and the origin as `og:url` on
every page, so a shared post rendered as "Max Leiter"; the parity migration
preserved that faithfully. Fixed on purpose in September 2026, together with
adding `BlogPosting` JSON-LD (`#jsonld`, article pages only, swapped by the
router like the page stylesheet).

**One router on every browser; no Speculation Rules native path.** See
Navigation for what the native path cost and the two browser facts it taught.

**`framework/` is laid out by build stage:** `shared/`, `content/`, `render/`,
`assets/`, `platform/`, `client/`. The names say when a module runs, so a file's
folder answers "what depends on this" before you open it. `shared/` carries the
strongest rule in the repo, stated in a docblock at the top of each of its four
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
so it runs before the browser has painted; starting the homepage island's
import there put all of it on the critical path, for an island whose markup is
already server-rendered and already reads as links.

**Fonts are subset to what the site renders and instanced to 400-700.** The
subset used to name eight whole Unicode blocks, 1,208 codepoints, of which Geist
covers 262; it is now Latin-1 plus 24 explicit codepoints Geist has glyphs for,
out of everything above U+00FF in the built output and in the sources that mint
text at runtime. The weight axis is clamped to the three weights the CSS asks
for, and the OpenType features to the ones browsers apply by default plus
`tnum`; Geist's stylistic sets, fractions and superscripts were ~140 unused
glyphs per face. Each face is split into files with disjoint `unicode-range`s:
a preloaded core (ASCII, the four Latin-1 characters the output uses, the
extras) and the other 92 Latin-1 characters, which a browser fetches only for
a page that renders one, at the cost of kerning across that boundary. The
preload is the largest single item on a first visit: 64.3 KB, then 40.4 KB,
now 25.5 KB.

**Geist Mono's missing diagram glyphs are drawn, not left to fallback.** It has
─ │ ┌ └ ├ ▲ ▼ and no ┐ ┘ ┤ ┬ ┴ ┼ ► ◄, so every diagram in a post took those
from a system font: Menlo at 400, full-width Hiragino at 600 and 700 on macOS,
0.55em Consolas on Windows, and the lines stopped meeting.
`scripts/box-drawing.py` cuts the six corners from the same two bars Geist's
own box glyphs are made of, with the same weight variation, and lays the
pointers on the ─ bar's centre line so a line runs into the tip. They go into
an 844-byte committed face that claims exactly those codepoints and loads
only on a page that uses one. Its sidecar names the codepoints and the hash of
the core subset they were cut from, and the build fails with the command to
rerun when the core has changed since. It is Python because fontTools is what
can write a variable font's `gvar`; the build only copies the result.

**Tailwind's preflight is trimmed, not disabled.** `app/styles/global.css`
carries the two thirds of it the site has elements for. The rest — every
date/time input pseudo-element, `optgroup`, `progress`, `textarea`, the Firefox
`:invalid` fixes — is gone, for about 500 B brotli off every page. That block is
the one file that has to be rechecked on a Tailwind major upgrade.

**The image ladder is `[640, 828, 1536, 1920]` and `sizes` follows the glass
reader's text column:** the viewport less 40px on a phone, less 132px up to
900px, and 768px flat above that. An earlier `700px` understated the desktop
column by 68px, and a DPR-2 desktop screen — the modal visitor — was served the
1920 candidate for a 1536-pixel need.

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
