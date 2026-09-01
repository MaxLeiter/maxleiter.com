# framework

This isn't a framework. It's a build script with opinions.

[`build.ts`](../build.ts) reads my posts, renders every page with React on the
server, writes HTML files, and exits. No server. No code runs when you request
a page. A blog post ships about 1 KB of JavaScript. The homepage, which has a
draggable window manager on it, ships about 15 KB. The whole site builds in
about half a second. Output is a
[Vercel Build Output](https://vercel.com/docs/build-output-api/v3) directory,
which is just static files plus a routing table.

What I gave up: hot reload, any kind of plugin system, and the ability to hand
this to someone else and have it make sense without reading it. It's a few
thousand lines that build one website. That's the point.

## How a page gets built

[`build.ts`](../build.ts) runs these steps. The independent ones overlap.

1. [`content.ts`](./content.ts) reads `posts/` and `notes/`, parses
   frontmatter, throws out anything with `published: false`, and sorts by date.
   That plus the project list is the `BuildContext` every later step gets.

2. esbuild bundles [`entry-server.ts`](./entry-server.ts) and everything it
   imports into one module. Path aliases, JSX and CSS modules all resolve here,
   once. This is why the build produces identical bytes under Bun and Node.

3. [`mdx.ts`](./mdx.ts) compiles each MDX file once and caches by content hash.
   [`highlight.ts`](./highlight.ts) runs Shiki with two themes and emits CSS
   variables instead of fixed colors, so switching light and dark is a CSS
   selector and costs zero client JS.

4. [`routes.ts`](./routes.ts) lists every route. [`render.tsx`](./render.tsx)
   renders each with `renderToStaticMarkup` and wraps it in the document shell:
   head tags, the inlined stylesheet, and a small blocking script that applies
   the saved theme before first paint.

5. [`css.ts`](./css.ts) runs the Tailwind CLI over `app/styles/`. Each CSS
   module becomes a fragment keyed on the class names it exports. A page gets a
   fragment only if its markup uses one of those classes. There's no list of
   optional styles to maintain. If a module can't be gated, because it styles a
   bare element or `:root`, it goes in the base sheet and the build logs it.

6. [`client.ts`](./client.ts) bundles the runtime and one module per island,
   with `react` and `react-dom` aliased to Preact's compat layer. Output lands
   in `/_assets/` with a content hash.

7. [`platform.ts`](./platform.ts) runs the parts that talk to Vercel rather than
   React: Open Graph images ([`og.ts`](./og.ts)), the feed, sitemap, robots file
   and search index ([`feeds.ts`](./feeds.ts)), and the routing config
   ([`vercel.ts`](./vercel.ts)). [`fonts.ts`](./fonts.ts) subsets the fonts first
   because the shell needs the `@font-face` rules. If any of this fails, the
   build fails. A site with no feed and no routing table shouldn't exit 0.

8. The build writes into a scratch directory named after its own PID and
   renames it into place at the end. A failed build leaves the previous good
   output alone, and two builds running at once don't corrupt each other.

## Islands

An island is a chunk of the page that becomes interactive after load.
Everything else stays inert markup.

You declare one by wrapping server-rendered children:

```tsx
<Island name="file-tree" on="visible" props={{ tree, classes }}>
  <FileTree tree={tree} classes={classes} />
</Island>
```

[`islands.tsx`](./islands.tsx) turns that into a `<div>` with the island's name,
trigger, and props as JSON. The children are real markup, so the page works
without JavaScript, and the client hydrates the same component over them
instead of replacing them.

Four triggers. `load` mounts immediately. `idle` waits for the browser to be
free. `visible` waits until the island is near the viewport. `interaction`
waits for a pointer or focus. All `visible` islands on a page share one
IntersectionObserver.

[`client/runtime.ts`](./client/runtime.ts) does the scheduling. It also handles
the stuff that doesn't need an island: the theme toggle, Cmd/Ctrl+K,
click-delegated analytics, and view-transition names. It's plain DOM code, no
library, which is how it stays around a kilobyte.

The island components live in `app/islands/`: the desktop, the command palette,
the MDX file tree, and the screenshot lightbox. They're written as normal React
and bundled as Preact, so the types and hooks are unchanged. Only the shipped
bytes are smaller.

## Navigation and transitions

Pages animate between each other with cross-document view transitions. That's
CSS, no script.

Chrome and Edge get the nice version. Every page has a speculation rules script
that prerenders same-origin links on hover and pointer-down, so by the time you
click, the next page is already rendered. Nothing else loads. The router below
is never downloaded.

Every other browser lazily imports [`client/router.ts`](./client/router.ts),
which intercepts same-origin clicks and swaps the document in place. This
exists to kill the loading indicator and the white flash mobile browsers show
between pages. It only touches plain left-clicks on same-origin links with no
`target`, `download` or `rel="external"`, so cmd-click and middle-click still
work. Every route is written twice, `index.html` and `index.partial.html`, and
the router fetches the partial. That's the title, meta tags, the page's CSS
fragment and the body, about a quarter the size of the full page. A missing
partial falls back to the full document.

Which path a browser takes is decided by checking whether the features exist,
not by reading the user agent.

One thing that took a while to figure out. Chrome skips the inbound half of a
cross-document view transition when the destination has an external module
script in `<head>`. Inline module scripts don't trigger it. So the runtime is
inlined into every page instead of linked. This is the actual reason it has a
size budget.

## Content

Posts are `.mdx` files in `posts/`, notes in `notes/`. Frontmatter has `title`,
`description`, `slug`, `date`, optionally `tags`, and `type` on notes.
`published: false` removes a file from everything, including the feed.

That's it. Add a file and you get the route, an embed variant at
`/blog/<slug>/embed`, an OG image, a feed entry, a sitemap entry, a search index
entry, and a card on the index page.

Images and tweets get resolved once and committed to git. Image dimensions go
in `app/data/image-dimensions.json` ([`image-dims.ts`](./image-dims.ts)). Tweet
payloads go in `app/data/tweets/<id>.json` ([`tweets.ts`](./tweets.ts)). Normal
builds read from the repo and never hit the network. Only a new image or tweet
triggers a fetch. A missing tweet fails the build because a broken tweet card
would ship silently. A missing image measurement just warns because the image
still renders.

To add an MDX component, put it in `app/mdx/static-components.tsx` if it's
static or `app/mdx/island-components.tsx` if it needs to be interactive, with a
matching island in `app/islands/`.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Watch, rebuild, serve on port 3000 with live reload ([`dev.ts`](./dev.ts)). No hot reload. Edits reload the page. |
| `pnpm build` | Production build under Node. This is what Vercel runs. |
| `pnpm build:bun` | Same build under Bun. Faster locally, identical output. |
| `pnpm check` | `tsc --noEmit`. |
| `pnpm lint` | oxlint and oxfmt. |
| `pnpm gate` | Build, snapshot, diff against the committed baseline. |

The gate is a parity harness. [`tools/snapshot.ts`](../tools/snapshot.ts)
normalizes built pages by stripping hashes and timestamps, and
[`tools/diff-html.ts`](../tools/diff-html.ts) compares head tags, prose, code
blocks and generated files against `docs/rewrite/baseline/`, which is what the
old Next.js site produced. This is how I knew the rewrite didn't break
anything.

Adding a post doesn't fail the gate. New routes get reported. Two things are
fatal: a route that used to exist and doesn't anymore, and a page in the output
that the route registry never declared. Re-baseline only when you mean to
change the output:

```
pnpm snapshot --dir .vercel/output/static --out docs/rewrite/baseline
```

## Deploying

[`vercel.json`](../vercel.json) sets three things that override the dashboard:
`framework` is `null`, the install command is a pinned pnpm version, and the
build command is [`scripts/build.mjs`](../scripts/build.mjs). That launcher runs
the build under Node. `bun run build.ts` is the local shortcut. The dashboard
preset should also say "Other" so Vercel doesn't try to run a Next.js build.

The build writes `.vercel/output/static/` and `config.json`. The config has
redirects, the embed rewrite, immutable asset headers, the 404 route and image
optimizer settings. It also writes `.vercel/output/routes.json`, a record of
every page it produced, outside `static/` so it's never served.

No environment variables. No secrets. No network requests during build.

## Files

| File | What it does |
| --- | --- |
| [`types.ts`](./types.ts) | Shared types. |
| [`content.ts`](./content.ts) | Reads posts, notes and projects into the build context. |
| [`mdx.ts`](./mdx.ts) | Compiles MDX once per file, cached by hash. |
| [`highlight.ts`](./highlight.ts) | Shiki in two themes, as CSS variables. |
| [`routes.ts`](./routes.ts) | Every route on the site. |
| [`routing.ts`](./routing.ts) | URL to file mapping, redirects, rewrites, content types. |
| [`entry-server.ts`](./entry-server.ts) | What esbuild bundles and the build imports. |
| [`render.tsx`](./render.tsx) | The HTML shell, head tags, and the partial variant. |
| [`islands.tsx`](./islands.tsx) | The `<Island>` marker and its manifest. |
| [`css.ts`](./css.ts) | Tailwind plus CSS modules into one base sheet. |
| [`client.ts`](./client.ts) | esbuild config for the runtime and islands. |
| [`client/runtime.ts`](./client/runtime.ts) | The inlined client runtime. |
| [`client/router.ts`](./client/router.ts) | The lazy same-document router. |
| [`transitions.ts`](./transitions.ts) | View-transition names. One owner. |
| [`platform.ts`](./platform.ts) | Runs OG, feeds and config together. |
| [`og.ts`](./og.ts) | Open Graph images, rendered and cached at build. |
| [`feeds.ts`](./feeds.ts) | feed.xml, sitemap.xml, robots.txt, search-index.json. |
| [`vercel.ts`](./vercel.ts) | `config.json` and the root `vercel.json`. |
| [`images.tsx`](./images.tsx) | `<Img>` with optimizer srcset. |
| [`image-dims.ts`](./image-dims.ts) | Measured sizes for remote images. |
| [`tweets.ts`](./tweets.ts) | Tweet payloads, fetched once and committed. |
| [`committed.ts`](./committed.ts) | The read-then-fetch-then-write pattern those two share. |
| [`fonts.ts`](./fonts.ts) | Subsets the two variable fonts and returns their CSS. |
| [`dev.ts`](./dev.ts) | Watch, rebuild, serve, reload. |
| [`node-bundle.json`](./node-bundle.json) | esbuild settings shared by the build and launcher. |
| [`platform.test.ts`](./platform.test.ts) | Runs every platform step on real content and checks the output. |

## Decisions

Longer reasoning is in [`docs/rewrite/CONTRACT.md`](../docs/rewrite/CONTRACT.md).

- Directories, not filename overrides. `/blog/weights` is
  `blog/weights/index.html`, which Vercel serves with no routing rule. One
  function in [`routing.ts`](./routing.ts) owns the mapping. The build, dev
  server and harness all call it.

- Everything at build time. The old site fetched GitHub star counts during the
  build, then discarded them before rendering, and failed the build when the
  token was missing. Gone.

- The runtime is inlined, not linked. Chrome's view transition behavior with
  external module scripts is the only reason. It's also why there's a size
  budget.

- Feature detection, never UA sniffing. If Safari ships speculation rules next
  month, it takes the better path automatically.

- Islands take class names as props and never import CSS modules. The client
  bundler has no CSS module plugin on purpose. Break the rule and the build
  fails instead of shipping duplicate styles.

- Image sizes are measured, not guessed. Wrong aspect ratios reserve the wrong
  box and the page still jumps. Measuring was the whole point.

- Committed inputs aren't caches. Tweet payloads and image measurements are in
  git because a missing one means something changed. `.cache/` is keyed by
  content hash and safe to delete.

- The sitemap comes from the build's own route manifest, not a handwritten list.
  The list it replaced had been missing four top-level pages for a while.
