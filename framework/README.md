# framework

It is not a framework. It is a build script.

Everything in this directory exists to turn a folder of markdown into a folder
of HTML. [`build.ts`](../build.ts) reads the posts, renders every route with
React, writes the files, and stops. There is no server, no request-time code
and no framework dependency. What the browser gets is a finished document, one
stylesheet already inside it, and a runtime of about a kilobyte. A page of
prose ships about **1 KB of JavaScript**; the homepage, which has a window
manager on it, ships about **15 KB**. A full build takes about **half a
second**. The output is a
[Vercel Build Output](https://vercel.com/docs/build-output-api/v3) directory:
static files plus a routing table.

The trade is deliberate. There is no Fast Refresh, no incremental adoption
path, and no plugin API. It is a few thousand lines that do one site.

## How a page is built

[`build.ts`](../build.ts) runs these in order, overlapping the ones that do not
depend on each other.

1. **Read the content.** [`content.ts`](./content.ts) reads `posts/` and
   `notes/`, parses the frontmatter, drops anything marked `published: false`,
   and sorts by date. That, plus the project list, is the `BuildContext` every
   later step is handed.

2. **Bundle the server code once.** esbuild compiles
   [`entry-server.ts`](./entry-server.ts) and everything it reaches into one
   module. Path aliases, JSX and CSS modules are resolved here, one time, which
   is why the build produces identical bytes under Bun and under Node.

3. **Compile the MDX.** [`mdx.ts`](./mdx.ts) compiles each file once and caches
   the result by content hash. [`highlight.ts`](./highlight.ts) highlights code
   with Shiki in two themes at once, emitting CSS custom properties rather than
   fixed colors. Switching between light and dark is a CSS selector, so
   highlighting costs no client JavaScript at all.

4. **Render with React.** [`routes.ts`](./routes.ts) lists every route on the
   site. [`render.tsx`](./render.tsx) renders each one to a string with
   `renderToStaticMarkup` and wraps it in the document shell: head tags, the
   inlined stylesheet, and a small blocking script that applies the saved theme
   before the first paint.

5. **Build the stylesheet.** [`css.ts`](./css.ts) runs the Tailwind CLI over
   `app/styles/`. Each CSS module becomes its own fragment, keyed on the scoped
   class names it exports, and a page carries a fragment only when its markup
   mentions one of them. There is no list of optional styles to keep updated. A
   module that cannot be gated safely, because it styles a bare element or
   `:root`, goes into the base sheet and the build says so out loud.

6. **Build the client bundles.** [`client.ts`](./client.ts) bundles the runtime
   and one module per island, with `react` and `react-dom` pointed at Preact's
   compatibility layer. Output goes to `/_assets/` under a content hash.

7. **Write the platform files.** [`platform.ts`](./platform.ts) runs the parts
   that talk to the host rather than to React: Open Graph images
   ([`og.ts`](./og.ts)), the feed, sitemap, robots file and search index
   ([`feeds.ts`](./feeds.ts)), and the routing config
   ([`vercel.ts`](./vercel.ts)). Fonts are subset first by
   [`fonts.ts`](./fonts.ts), because the shell needs their `@font-face` rules.
   A failure here stops the build, on purpose: a site with no feed and no
   routing table should not exit zero.

8. **Publish the directory.** The build writes into a scratch directory named
   after its own process id and renames it into place at the end, so the window
   where `.vercel/output` is incomplete is one rename wide and a failed build
   leaves the last good output untouched.

## Islands

An island is a piece of the page that becomes interactive after it loads.
Everything else is markup and never wakes up.

A page declares one by wrapping server-rendered children:

```tsx
<Island name="file-tree" on="visible" props={{ tree, classes }}>
  <FileTree tree={tree} classes={classes} />
</Island>
```

[`islands.tsx`](./islands.tsx) turns that into a plain `<div>` carrying the
island's name, its trigger, and its props as JSON. The children inside it are
real markup, so the page works with JavaScript turned off, and the client
renders the same component over the top rather than replacing it.

There are four triggers. `load` mounts immediately, `idle` waits for the
browser to be free, `visible` waits until the island approaches the viewport,
and `interaction` waits until someone points at it or focuses it. All the
`visible` islands on a page share one observer.

[`client/runtime.ts`](./client/runtime.ts) does the scheduling, and also owns
what needs no island at all: the theme toggle, the Cmd/Ctrl+K shortcut,
click-delegated analytics, and view-transition names. It is written against the
DOM with no library, which is what keeps it near a kilobyte.

The island components live in `app/islands/`: the homepage desktop, the command
palette, the MDX file tree, and the screenshot grid's lightbox. They are bundled
with Preact through React's compatibility layer, so the source, the types and
the hooks stay ordinary React and only the shipped copy is smaller.

## Navigation and transitions

Pages animate between each other using cross-document view transitions, which
are declared in CSS and need no script.

Chrome and Edge get the good path. Every page carries a speculation rules
script that prerenders same-origin links on hover and on pointer-down, so the
next document is already rendered when the click lands. Nothing else is
installed, and the router below is never downloaded.

Everywhere else, the runtime lazily imports
[`client/router.ts`](./client/router.ts), which intercepts same-origin clicks
and swaps the document in place. It exists to remove the browser's loading
indicator and the blank flash mobile browsers show mid-navigation. It handles
only ordinary left-clicks on same-origin links with no `target`, no `download`
and no `rel="external"`, so command-click and middle-click stay native. Every
route is written twice, as `index.html` and as `index.partial.html` beside it,
and the router fetches the partial: just the title, that page's meta tags, its
CSS fragment and its body. A missing partial falls back to the full document.
Which of the two paths a browser takes is settled by asking whether the
features exist, never by reading the user agent string.

One hard-won detail. Chrome skips the inbound half of a cross-document view
transition when the destination has an external module script in its `<head>`.
An inline module script does not trigger it. So the runtime is inlined into
every page rather than linked, which is also why it has to stay small.

## Content

A post is an `.mdx` file in `posts/`; a note is one in `notes/`. The
frontmatter carries `title`, `description`, `slug` and `date`, plus optional
`tags`, and `type` on notes. Setting `published: false` removes a file from
the build entirely, including from the feed.

Nothing else needs registering. Adding the file gives you the route, an embed
variant at `/blog/<slug>/embed`, an Open Graph image, a feed entry, a sitemap
entry, a line in the search index, and a card on the relevant index page.

Images and tweets are resolved once and then committed. Intrinsic image sizes
are measured into `app/data/image-dimensions.json`
([`image-dims.ts`](./image-dims.ts)); tweet payloads land in
`app/data/tweets/<id>.json` ([`tweets.ts`](./tweets.ts)). Both are read from
the repository on every ordinary build, so the network is touched only the
first time the build sees something new. A missing tweet stops the build, since
a half-rendered card would otherwise ship unnoticed; a missing measurement only
warns, since the image still renders.

To add an MDX component, put it in `app/mdx/static-components.tsx` if it
renders once and never changes, or in `app/mdx/island-components.tsx` if it
needs to become interactive, alongside an island in `app/islands/`.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Watch, rebuild and serve on port 3000, with live reload ([`dev.ts`](./dev.ts)). No Fast Refresh: an edit reloads the page. |
| `pnpm build` | The production build, under Node. This is what the host runs. |
| `pnpm build:bun` | The same build under Bun. Faster locally, identical output. |
| `pnpm check` | Typecheck with `tsc --noEmit`. |
| `pnpm lint` | Lint with oxlint, format with oxfmt. |
| `pnpm gate` | Build, snapshot the output, and diff it against the committed baseline. |

The gate is a parity harness. [`tools/snapshot.ts`](../tools/snapshot.ts)
normalizes the built pages, stripping hashes and timestamps, and
[`tools/diff-html.ts`](../tools/diff-html.ts) compares head tags, prose, code
blocks and generated files against `docs/rewrite/baseline/`, the recorded
output of the site this replaced.

Publishing a post does not fail the gate; new routes are reported and listed.
Two things stay fatal: a route that used to exist and no longer does, and a
page in the output that the route registry never declared. Re-baseline only
when a change to the output is intended, and say why in the commit:

```
pnpm snapshot --dir .vercel/output/static --out docs/rewrite/baseline
```

## Deploying

[`vercel.json`](../vercel.json) pins three things, and all three override
whatever the project dashboard says: `framework` is `null`, the install command
is an explicit pinned pnpm, and the build command is
[`scripts/build.mjs`](../scripts/build.mjs). That launcher runs the build under
Node; `bun run build.ts` is the local shortcut to the same thing. The dashboard
framework preset should also read **Other**, so a preset never quietly puts a
Next.js build back in front of this one.

The build writes `.vercel/output/static/` plus `config.json`, which carries the
redirects, the embed rewrite, the immutable asset headers, the 404 route and
the image optimizer settings. It also writes `.vercel/output/routes.json`, a
record of every document it produced, deliberately outside `static/` so it is
never served.

There are no environment variables. The build reads no secrets and makes no
network requests.

## Files

| File | Purpose |
| --- | --- |
| [`types.ts`](./types.ts) | The shared types every other file imports. |
| [`content.ts`](./content.ts) | Reads posts, notes and projects into the build context. |
| [`mdx.ts`](./mdx.ts) | Compiles MDX once per file, cached by content hash. |
| [`highlight.ts`](./highlight.ts) | Shiki highlighting in two themes, as CSS variables. |
| [`routes.ts`](./routes.ts) | The registry of every route on the site. |
| [`routing.ts`](./routing.ts) | How a URL becomes a file: redirects, rewrites, content types. |
| [`entry-server.ts`](./entry-server.ts) | The entry point esbuild bundles and the build imports. |
| [`render.tsx`](./render.tsx) | The HTML shell, the head tags, and the partial variant. |
| [`islands.tsx`](./islands.tsx) | The build-time `<Island>` marker and its manifest. |
| [`css.ts`](./css.ts) | Tailwind plus the CSS modules, into one base sheet. |
| [`client.ts`](./client.ts) | esbuild bundles for the runtime and each island. |
| [`client/runtime.ts`](./client/runtime.ts) | The inlined client runtime. |
| [`client/router.ts`](./client/router.ts) | The lazily loaded same-document router. |
| [`transitions.ts`](./transitions.ts) | The one owner of view-transition names. |
| [`platform.ts`](./platform.ts) | Runs the OG, feed and config steps together. |
| [`og.ts`](./og.ts) | Open Graph images, rendered and cached at build. |
| [`feeds.ts`](./feeds.ts) | feed.xml, sitemap.xml, robots.txt, search-index.json. |
| [`vercel.ts`](./vercel.ts) | `config.json` and the root `vercel.json`. |
| [`images.tsx`](./images.tsx) | The `<Img>` component and its optimizer srcset. |
| [`image-dims.ts`](./image-dims.ts) | Measured intrinsic sizes for remote images. |
| [`tweets.ts`](./tweets.ts) | Tweet payloads, fetched once and committed. |
| [`committed.ts`](./committed.ts) | The shared read-then-fetch-then-write pattern those two use. |
| [`fonts.ts`](./fonts.ts) | Subsets the two variable fonts and returns their CSS. |
| [`dev.ts`](./dev.ts) | Watch, rebuild, serve, reload. |
| [`node-bundle.json`](./node-bundle.json) | The esbuild settings the build and its launcher share. |
| [`platform.test.ts`](./platform.test.ts) | Runs every platform step against real content and checks the files. |

## Decisions

The reasoning behind these lives in
[`docs/rewrite/CONTRACT.md`](../docs/rewrite/CONTRACT.md).

- **Directories, not filename overrides.** `/blog/weights` is written as
  `blog/weights/index.html`, which the filesystem handler serves with no rule.
  One function in [`routing.ts`](./routing.ts) owns that mapping, and the write
  loop, the dev server and the harness all call it.

- **Everything happens at build time.** No server, no request-time code, no
  secrets, no network. The one value the old build went to the network for was
  discarded before anything rendered it, and failed the build whenever its
  token was missing.

- **The runtime is inlined, not linked.** An external module script in the head
  makes Chrome skip the inbound view transition. That is the only reason, and
  it is why the runtime has a size budget.

- **Feature detection, never user agent sniffing.** No branch asks who the
  browser is. A browser that ships speculation rules tomorrow takes the better
  path with no change here, and none of this can go stale.

- **Islands take class names as props and never import a CSS module.** The
  client bundler has no CSS module plugin, deliberately, so breaking the rule
  fails loudly instead of shipping a second copy of styles the page inlines.

- **Image sizes are measured, not guessed.** A wrong aspect ratio reserves the
  wrong box and the page still jumps when the image arrives, which is the whole
  problem reserving space was meant to solve.

- **Committed inputs are not caches.** Tweet payloads and image measurements
  are tracked in git, because their absence is a question worth answering.
  Everything in `.cache/` is keyed by content hash and safe to delete.

- **The sitemap is derived from the build's own output.** It reads the route
  manifest rather than a list someone wrote down. The list it replaced had
  quietly been missing four top-level pages.
