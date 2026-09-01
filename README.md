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
  - `test`: the platform check (feeds, OG images, font subsets, vercel.json)
  - `gate`: build, then diff the output against the committed snapshot
  - `snapshot`: rewrite that snapshot, when you mean to change the output

### Directory structure

- `build.ts`: the whole build
- `framework/shared/`: types, URL routing rules, view-transition names
- `framework/content/`: posts, notes, projects, committed tweets and image sizes
- `framework/render/`: the route registry, the HTML shell, MDX, highlighting, islands
- `framework/assets/`: the Tailwind sheet, the client bundles, the font subsets
- `framework/platform/`: OG images, feeds, sitemap, Vercel config
- `framework/client/`: the runtime and the same-document router
- `app/pages/`: page components; `app/islands/`: the interactive ones
- `app/components/`, `app/mdx/`, `app/styles/`: shared components, the MDX component maps, and global styles
- `posts/`, `notes/`: MDX content rendered at build time
- `public/`: favicons, blog images, and the KnightOS emulator, copied verbatim
- `tools/snapshot.ts`: the regression gate
- `docs/`: [`ARCHITECTURE.md`](docs/ARCHITECTURE.md), and the snapshot the gate compares against

Output is the [Vercel Build Output API](https://vercel.com/docs/build-output-api/v3):
static files plus a route table in `.vercel/output/`.

### License

MIT
