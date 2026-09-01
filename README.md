## My personal site

Built with a small static site generator that lives in this repo. React and MDX
render every route to HTML at build time; the browser gets that HTML, one
inlined stylesheet, and a ~2 KB runtime that hydrates the few interactive parts
as Preact islands. No framework, no server, no runtime data fetching.

### Getting started

1. Install the `pnpm` package manager: https://pnpm.io/
2. Run `pnpm install` in the project directory
3. Run `pnpm dev` to start a local development server on http://localhost:3000

### Environment variables

None. The build reads no secrets and makes no network requests. `PORT`
overrides the dev server's default of 3000.

### Usage

- `pnpm <command>`:
  - `dev`: watch, rebuild and serve locally with live reload
  - `build`: the production build, under Node — this is what Vercel runs
  - `build:bun`: the same build under Bun, faster locally, identical output
  - `check`: typecheck with `tsc --noEmit`
  - `lint`: lint with oxlint and format with oxfmt
  - `gate`: build, then diff the output against the committed parity baseline
  - `snapshot` / `verify`: the two halves of `gate`, separately

### Directory structure

- `build.ts`: the whole build
- `framework/`: content loading, MDX, syntax highlighting, rendering, CSS, client bundles, islands, routes, and the platform steps (OG images, feeds, sitemap, Vercel config, fonts)
- `app/pages/`: page components; `app/islands/`: the interactive ones
- `app/components/`, `app/mdx/`, `app/styles/`: shared components, the MDX component maps, and global styles
- `posts/`, `notes/`: MDX content rendered at build time
- `public/`: favicons, blog images, and the KnightOS emulator, copied verbatim
- `tools/`: the snapshot and HTML-diff parity harness
- `docs/rewrite/`: design docs and the committed output baseline

Output is the [Vercel Build Output API](https://vercel.com/docs/build-output-api/v3):
static files plus a route table in `.vercel/output/`.

### License

MIT
