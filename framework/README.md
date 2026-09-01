# framework

This isn't a framework. It's a build script with opinions.

[`build.ts`](../build.ts) reads my posts, renders every page with React on the
server, writes HTML files, and exits. No server. No code runs when you request
a page. A blog post ships about 1 KB of JavaScript. The homepage, which has a
draggable window manager on it, ships about 17 KB, none of it before first
paint. The whole site builds in
about half a second. Output is a
[Vercel Build Output](https://vercel.com/docs/build-output-api/v3) directory,
which is just static files plus a routing table.

What I gave up: hot reload, any kind of plugin system, and the ability to hand
this to someone else and have it make sense without reading it. It's a few
thousand lines that build one website. That's the point.

## How a page gets built

[`build.ts`](../build.ts) runs these steps. The independent ones overlap.

1. [`content/index.ts`](./content/index.ts) reads `posts/` and `notes/`, parses
   frontmatter, throws out anything with `published: false`, and sorts by date.
   That plus the project list is the `BuildContext` every later step gets.

2. esbuild bundles [`render/index.ts`](./render/index.ts) and everything it
   imports into one module. Path aliases and JSX all resolve here, once. This
   is why the build produces identical bytes under Bun and Node.

3. [`render/mdx.ts`](./render/mdx.ts) compiles each MDX file once and caches by
   content hash. [`render/highlight.ts`](./render/highlight.ts) runs Shiki with two themes and emits CSS
   variables instead of fixed colors, so switching light and dark is a CSS
   selector and costs zero client JS.

4. [`render/pages.ts`](./render/pages.ts) lists every route.
   [`render/shell.tsx`](./render/shell.tsx) renders each with `renderToStaticMarkup` and wraps it in the document shell:
   head tags, the inlined stylesheet, and a small blocking script that applies
   the saved theme before first paint.

5. [`assets/css.ts`](./assets/css.ts) runs the Tailwind CLI over `app/styles/`
   for the base sheet. Every other stylesheet is a fragment with a marker: a
   page gets it only if its markup carries that class prefix. Class names are
   written already scoped, so there's no CSS-module compiler and no generated
   `.d.ts` files. Adding a sheet means adding a line to `PLAIN_SHEETS` in
   [`build.ts`](../build.ts); a sheet without one ships nowhere.

6. [`assets/client.ts`](./assets/client.ts) bundles the runtime and one module
   per island,
   with `react` and `react-dom` aliased to Preact's compat layer. Output lands
   in `/_assets/` with a content hash.

7. [`platform/index.ts`](./platform/index.ts) runs the parts that talk to Vercel rather than
   React: Open Graph images ([`og.ts`](./platform/og.ts)), the feed, sitemap,
   robots file and search index ([`feeds.ts`](./platform/feeds.ts)), and the
   routing config ([`vercel.ts`](./platform/vercel.ts)). They run together in
   one `Promise.all` because they write disjoint files.
   [`assets/fonts.ts`](./assets/fonts.ts) subsets the fonts first because the shell
   needs the `@font-face` rules. If any of this fails, the
   build fails. A site with no feed and no routing table shouldn't exit 0.

8. The build writes into a scratch directory named after its own PID and
   renames it into place at the end. A failed build leaves the previous good
   output alone, and two builds running at once don't corrupt each other.

## Islands

An island is a chunk of the page that becomes interactive after load.
Everything else stays inert markup.

You declare one by wrapping server-rendered children:

```tsx
<Island name="file-tree" on="visible" props={{ tree }}>
  <FileTree tree={tree} />
</Island>
```

[`render/islands.tsx`](./render/islands.tsx) turns that into a `<div>` with the island's name,
trigger, and props as JSON. The children are real markup, so the page works
without JavaScript, and the client hydrates the same component over them
instead of replacing them.

Two triggers. `load` mounts after the first paint. `visible` waits until the
island is near the viewport; all `visible` islands on a page share one
IntersectionObserver. There used to be four. `idle` was the default nothing
asked for, and `interaction` had one user, the command palette, which renders
`hidden` where a pointer listener can never fire. The palette is mounted by
name instead, from `openPalette()`.

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
in `app/data/image-dimensions.json` ([`content/dimensions.ts`](./content/dimensions.ts)). Tweet
payloads go in `app/data/tweets/<id>.json` ([`content/tweets.ts`](./content/tweets.ts)). Normal
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
| `pnpm test` | The platform check ([`platform/test.ts`](./platform/test.ts)). `bun run`, never `bun test`. |
| `pnpm gate` | Build, then diff the output against `docs/snapshot.json`. |
| `pnpm snapshot` | Rewrite `docs/snapshot.json`. |

The gate is a self-comparison. [`tools/snapshot.ts`](../tools/snapshot.ts)
writes one row per route — title, description, canonical, OG image, noindex,
the size of the partial, and hashes of the prose and the code blocks — and
diffs it against `docs/snapshot.json`. It used to diff against a committed copy
of the old Next.js output, which was how I knew the rewrite didn't break
anything. That baseline is gone, and the question the gate answers now is the
one I actually have: did anything change since the last output I looked at.

Adding a post doesn't fail the gate. New routes get reported. Three things are
fatal: a route that used to exist and doesn't anymore, a changed field or hash,
and a page in the output the route registry never declared. Re-baseline only
when you mean to change the output, with `pnpm snapshot`, and read the diff —
it's written to be readable.

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
