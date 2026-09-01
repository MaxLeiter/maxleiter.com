# Deploying a bespoke SSG to Vercel via the Build Output API (2026 research)

Research date: 2026-08-30. All claims cited. Anything I could not confirm from a primary
source is labelled **UNVERIFIED**.

Primary sources are Vercel's own docs (each page carries a `last_updated` field, quoted where
relevant) plus the `vercel/vercel` and `vercel/examples` repositories.

---

## 0. TL;DR for the decision

- The Build Output API v3 is a **first-class, supported** path for a hand-rolled framework. Vercel
  explicitly documents it for "if you are not using a framework and would like to still take
  advantage of any of the features that those frameworks provide."
  ([/docs/build-output-api](https://vercel.com/docs/build-output-api))
- Zero-config pickup works: set framework preset to **Other** (`framework: null`) plus a build
  command, and if your build script leaves a `.vercel/output/config.json` behind, `@vercel/static-build`
  hands the directory straight to the deploy pipeline and does nothing else. Verified in source
  (see §1.5).
- What you **keep**: image optimization (`/_vercel/image`), functions (Node 24), ISR/prerender,
  crons, edge middleware, routing/headers/redirects, brotli, analytics, speed insights, WAF,
  Fluid compute (automatic).
- What you **lose or must hand-roll**: `cleanUrls` semantics (you must emit `overrides`, §8.2/§8.3),
  trailing-slash normalization (explicit routes, §5.3), skew protection (manual, and Pro-only, §5.5),
  `vercel dev` (explicitly unsupported with BOA v3 output — §8.6).

Three findings that should shape the design before you write any code:

1. **Emit directory output (`blog/foo/index.html`), not `overrides`.** Astro's adapter does this and
   consequently ships *zero* `overrides` entries; SvelteKit and Nitro use the `overrides` map and
   pay for it in per-page bookkeeping plus a subtle trap where `overrides` *moves* a URL so every
   `dest` pointing at an overridden page must use the new path. §7.7 and §8.2.
2. **Use `@vercel/routing-utils`' `getTransformedRoutes()`, don't hand-write phase regexes.** It's
   what Vercel's docs recommend and what Astro actually does. §1.4.
3. **Pre-generate OG images at build time with `@vercel/og` in plain Node.** Empirically ~4 ms each,
   ~200 ms for 45 images, no native modules (it vendors WASM). Needs a two-global ESM shim. §3.5.

---

## 1. Build Output API v3

### 1.1 Directory layout

Source: [/docs/build-output-api](https://vercel.com/docs/build-output-api) (last_updated 2026-08-11),
[/docs/build-output-api/primitives](https://vercel.com/docs/build-output-api/primitives) (last_updated 2025-03-04).

```
.vercel/
└── output/
    ├── config.json                     # required; at minimum {"version": 3}
    ├── static/                         # served by the Vercel CDN at the deployment root
    │   ├── index.html
    │   ├── blog/one.html
    │   └── _assets/app.a1b2c3.css
    ├── functions/
    │   ├── api/search-index.func/      # -> URL path /api/search-index
    │   │   ├── .vc-config.json         # REQUIRED inside every .func
    │   │   └── index.js
    │   └── blog/post.func/             # -> URL path /blog/post
    │       ├── .vc-config.json
    │       └── index.js
    ├── functions/blog/post.prerender-config.json      # sibling of post.func, makes it ISR
    ├── functions/blog/post.prerender-fallback.html    # optional build-time fallback body
    └── immutable.json                  # optional; manifest for cross-deployment immutable assets
```

Key rules, quoted:

- "Static files that are *publicly accessible* from the Deployment URL should be placed in the
  `.vercel/output/static` directory… Files placed within this directory will be made available at
  the root (`/`) of the Deployment URL and **neither their contents, nor their file name or
  extension will be modified in any way.**"
- "The `.func` suffix on the directory name is *not included* as part of the URL path… a directory
  located at `.vercel/output/functions/api/posts.func` will be accessible at the URL path
  `/api/posts`."
- "A configuration file named `.vc-config.json` **must** be included within the `.func` directory."
- "A `.func` directory may be a symlink to another `.func` directory in cases where you want to have
  more than one path point to the same underlying Vercel Function."
- "Files outside of these directories are ignored and will not be served to visitors."

`immutable.json` (for cross-deployment shared assets, so a stale client's chunk URL still resolves
after a redeploy):

```jsonc
{
  "version": 1,
  "hashes": {
    "/_vercel/immutable/chunks/031du1f_9y2qz.js": "031du1f_9y2qzq-eul6pnkg4f"
  }
}
```
"The `VERCEL_HASH_SALT` (system environment variable) should be factored into the hashes to provide
a way to rotate the file names." "The deployment will fail if a hash collision was detected."

### 1.2 `config.json` full schema (as currently documented)

Source: [/docs/build-output-api/configuration](https://vercel.com/docs/build-output-api/configuration)
(last_updated 2026-07-27). Verbatim TypeScript:

```ts
type Config = {
  version: 3;
  routes?: Route[];
  images?: ImagesConfig;
  wildcard?: WildcardConfig;
  overrides?: OverrideConfig;
  cache?: string[];
  framework?: Framework;
  crons?: CronsConfig;
  services?: Service[];        // NEW in 2026 — multi-service deployments
};
```

Note: `services` is a 2026 addition not in the older docs; it points at
`.vercel/output/services/<name>` and is irrelevant to a single static site.

#### `routes`

```ts
type Route = Source | Handler;

type Source = {
  src: string;
  dest?: string;
  headers?: Record<string, string>;
  methods?: string[];
  continue?: boolean;
  caseSensitive?: boolean;
  check?: boolean;
  status?: number;
  has?: HasField;
  missing?: HasField;
  locale?: Locale;
  middlewareRawSrc?: string[];
  middlewarePath?: string;
  mitigate?: Mitigate;          // { action: 'challenge' | 'deny' }
  transforms?: Transform[];     // 2026 addition
};
```

Field semantics (verbatim from the table):

| Key | Description |
|---|---|
| `src` | "A PCRE-compatible regular expression that matches each incoming pathname (excluding querystring)." |
| `dest` | "A destination pathname or full URL, including querystring, with the ability to embed capture groups as `$1`, `$2`, or named capture value `$name`." |
| `headers` | "A set of headers to apply for responses." |
| `methods` | "A set of HTTP method types. If no method is provided, requests with any HTTP method will be a candidate for the route." |
| `continue` | "A boolean to change matching behavior. If true, routing will continue even when the src is matched." |
| `caseSensitive` | "Specifies whether or not the route `src` should match with case sensitivity." |
| `check` | "If `true`, the route triggers `handle: 'filesystem'` and `handle: 'rewrite'`" |
| `status` | "A status code to respond with. Can be used in tandem with `Location:` header to implement redirects." |
| `has` / `missing` | "Conditions of the HTTP request that must (NOT) exist to apply the route." |
| `locale` | i18n redirect map + cookie override |
| `middlewareRawSrc` / `middlewarePath` | wire an Edge function in as middleware |
| `mitigate` | `{ action: 'challenge' \| 'deny' }` — WAF action inline in routes |
| `transforms` | append/set/delete on `request.headers`, `request.query`, `response.headers`, or `set` on `request.path` |

`HasField`:

```ts
type HasField = Array<
  | { type: 'host'; value: string | MatchableValue }
  | { type: 'header' | 'cookie' | 'query'; key: string; value?: string | MatchableValue }
>;
```

`MatchableValue` (2026 addition — structured matching instead of raw regex):

```ts
type MatchableValue = {
  eq?: string | number; neq?: string;
  inc?: string[]; ninc?: string[];
  pre?: string; suf?: string; re?: string;
  gt?: number; gte?: number; lt?: number; lte?: number;
};
```

`Transform` (2026 addition):

```ts
type Transform =
  | { type: 'request.headers' | 'request.query' | 'response.headers';
      op: 'append' | 'set' | 'delete';
      target: { key: string | Omit<MatchableValue, 're'> };
      args?: string | string[]; }
  | { type: 'request.path'; op: 'set'; args: string; };
```

#### `handle` phases

```ts
type HandleValue =
  | 'rewrite'
  | 'filesystem'  // check matches after the filesystem misses
  | 'resource'
  | 'miss'        // check matches after every filesystem miss
  | 'hit'
  | 'error';      // check matches after error (500, 404, etc.)

type Handler = { handle: HandleValue; src?: string; dest?: string; status?: number; };
```

"The routing system has multiple phases. The `handle` value indicates the start of a phase. All
following routes are only checked in that phase."

**Important divergence:** `handle` is documented as **deprecated in `vercel.json`**
("`handle`: A special route type (e.g., `"handle": "filesystem"`) that controls routing phases. Use
`rewrites` instead" —
[/docs/project-configuration/vercel-json#deprecated-route-properties](https://vercel.com/docs/project-configuration/vercel-json)),
but it is **not** deprecated in the Build Output API `config.json`, where it remains the only way to
express phases. Vercel's own 2026 examples still emit `{ "handle": "filesystem" }` (see §7).

#### `images`

```ts
type ImageFormat = 'image/avif' | 'image/webp';

type RemotePattern = {
  protocol?: 'http' | 'https';
  hostname: string;   // NOTE: a regex in Build Output config.json
  port?: string;
  pathname?: string;  // regex
  search?: string;
};

type LocalPattern = { pathname?: string; search?: string };

type ImagesConfig = {
  sizes: number[];                 // REQUIRED
  domains: string[];               // REQUIRED (may be [])
  remotePatterns?: RemotePattern[];
  localPatterns?: LocalPattern[];
  qualities?: number[];
  minimumCacheTTL?: number;        // seconds
  formats?: ImageFormat[];
  dangerouslyAllowSVG?: boolean;
  contentSecurityPolicy?: string;
  contentDispositionType?: string;
};
```

`sizes` = "Allowed image widths." `domains` = "Allowed external domains that can use Image
Optimization. Leave empty for only allowing the deployment domain." `qualities` = "Allowed image
qualities. Leave undefined to allow all possibilities, 1 to 100." `localPatterns` = "Leave undefined
to allow all or use empty array to deny all."

#### `overrides` — the extensionless-HTML mechanism

```ts
type Override = { path?: string; contentType?: string };
type OverrideConfig = Record<string, Override>;
```

"The main use-cases are to override the `Content-Type` header that will be served for a static file,
and/or to serve a static file in the Vercel Deployment from a different URL path than how it is
stored on the file system."

Documented example:

```json
"overrides": {
  "blog.html": { "path": "blog" }
}
```

The key is the path **relative to `.vercel/output/static`** (no leading slash); `path` is the URL
path (also no leading slash).

#### `wildcard`, `cache`, `framework`, `crons`

```ts
type WildCard = { domain: string; value: string };   // maps a domain to the $wildcard route variable
type Cache = string[];                               // glob paths restored into the build sandbox
type Framework = { version: string };                // "This value is used for display purposes only."
type Cron = { path: string; schedule: string };
```

`cache` caveat, verbatim: "this property is only relevant when Vercel is building a Project from
source code, meaning it is **not** relevant when building locally or when creating a Deployment from
'prebuilt' build artifacts." So `cache` is exactly what you want in a git-deploy workflow (e.g.
`[".cache/**", "node_modules/**"]`) and a no-op with `--prebuilt`.

`crons` is production-deployment-only.

### 1.3 Worked `config.json` for the requested site

Requirements: clean URLs (`/blog/slug` → `blog/slug.html`), `301 /rss → /feed.xml`, immutable
cache-control on `/_assets/*`, a 404 page, one Node function at `/api/search-index`.

Assumed output tree:

```
.vercel/output/
├── config.json
├── static/
│   ├── index.html
│   ├── 404.html
│   ├── feed.xml
│   ├── _assets/app.a1b2c3d4.css
│   └── blog/modern-irc.html
└── functions/api/search-index.func/
    ├── .vc-config.json
    └── index.js
```

```json
{
  "version": 3,
  "routes": [
    {
      "src": "^/_assets/(.*)$",
      "headers": { "cache-control": "public, max-age=31536000, immutable" },
      "continue": true
    },

    { "src": "^/rss/?$", "status": 301, "headers": { "Location": "/feed.xml" } },

    { "src": "^/(?:(.+)/)?index(?:\\.html)?/?$", "status": 308, "headers": { "Location": "/$1" } },
    { "src": "^/(.*)\\.html/?$",                 "status": 308, "headers": { "Location": "/$1" } },
    { "src": "^/(.*)\\/$",                       "status": 308, "headers": { "Location": "/$1" } },

    { "handle": "filesystem" },

    { "handle": "error" },
    { "src": "/.*", "dest": "/404", "status": 404 }
  ],

  "overrides": {
    "index.html":            { "path": "" },
    "404.html":              { "path": "404" },
    "blog/modern-irc.html":  { "path": "blog/modern-irc" }
  },

  "images": {
    "sizes": [640, 750, 828, 1080, 1200, 1920],
    "domains": [],
    "qualities": [75],
    "formats": ["image/avif", "image/webp"],
    "minimumCacheTTL": 31536000,
    "localPatterns": [{ "pathname": "^/_assets/.*$", "search": "" }]
  },

  "cache": ["node_modules/**", ".cache/**"],

  "framework": { "version": "0.1.0" }
}
```

Notes on why it is shaped that way:

1. **Header routes go first and use `"continue": true`.** Without `continue`, matching the header
   route *terminates* routing and you serve nothing. The vercel.json docs make this explicit for the
   low-level form: "With `routes`, you use `"continue": true` to prevent stopping at the first
   match."
2. **Redirects must precede `handle: filesystem`.** Everything before the first `handle` marker runs
   in the initial phase, before the filesystem is consulted.
3. **`overrides` is what makes `/blog/modern-irc` resolve.** Static files are served by exact
   filesystem path with no extension stripping ("neither their contents, nor their file name or
   extension will be modified in any way"). Without the override, `/blog/modern-irc` 404s and
   `/blog/modern-irc.html` serves. Overrides are also what sets the correct `Content-Type` for an
   extensionless file — see §8.2.
4. **404** — the `{ "handle": "error" }` + `{ src, dest, status: 404 }` shape is exactly what the
   Next.js builder emits, so it is verified rather than guessed.
   [`packages/next/src/index.ts`](https://github.com/vercel/vercel/blob/main/packages/next/src/index.ts)
   (~line 2911):

   ```js
   // error handling
   { handle: 'error' },
   {
     src: path.join('/', entryDirectory, '.*'),
     dest: path.join('/', static404Page),
     status: 404,
   },
   ```

   **Note `dest` is `/404`, not `/404.html`.** `overrides` *moves* a file's URL rather than adding an
   alias — the docs say it serves the file "from a different URL path than how it is stored on the
   file system", and the whole point of the `cleanUrls` 308 from `/foo.html` → `/foo` is that the
   `.html` URL is no longer the canonical one. Once `"404.html": { "path": "404" }` is in
   `overrides`, `dest: "/404.html"` will not resolve. Same applies to every other `dest` you write
   that targets an overridden page.

   SvelteKit uses the flatter `{ src, status: 404, headers, continue: false }` form for its narrower
   "missing hashed asset" case (§7.3) — that one returns a bare 404 with no body, which is what you
   want for assets.
5. **The three 308 redirect routes are not hand-invented** — they are exactly what
   `@vercel/routing-utils` emits for `cleanUrls: true, trailingSlash: false`. Verbatim from
   [`packages/routing-utils/src/superstatic.ts`](https://github.com/vercel/vercel/blob/main/packages/routing-utils/src/superstatic.ts):

   ```ts
   export function convertCleanUrls(cleanUrls, trailingSlash?, status = 308): Route[] {
     const routes = [];
     if (cleanUrls) {
       const loc = trailingSlash ? '/$1/' : '/$1';
       routes.push({ src: '^/(?:(.+)/)?index(?:\\.html)?/?$', headers: { Location: loc }, status });
       routes.push({ src: '^/(.*)\\.html/?$',                  headers: { Location: loc }, status });
     }
     return routes;
   }

   export function convertTrailingSlash(enable, status = 308): Route[] {
     const routes = [];
     if (enable) {
       routes.push({ src: '^/\\.well-known(?:/.*)?$' });                                     // exempt
       routes.push({ src: '^/((?:[^/]+/)*[^/\\.]+)$',      headers: { Location: '/$1/' }, status });
       routes.push({ src: '^/((?:[^/]+/)*[^/]+\\.\\w+)/$', headers: { Location: '/$1' },  status });
     } else {
       routes.push({ src: '^/(.*)\\/$', headers: { Location: '/$1' }, status });
     }
     return routes;
   }
   ```

   `cleanUrls`/`trailingSlash` themselves are `vercel.json`-level sugar that does not exist in
   `config.json` — see §1.4 for generating these mechanically instead of copying them.

### 1.4 Generating routes with `@vercel/routing-utils` (recommended)

Rather than hand-writing the phase logic, Vercel documents a helper. From
[/docs/build-output-api/features](https://vercel.com/docs/build-output-api/features), verbatim:

```typescript
import { writeFileSync } from 'fs';
import { getTransformedRoutes } from '@vercel/routing-utils';

const { routes } = getTransformedRoutes({
  trailingSlash: false,
  redirects: [
    { source: '/me', destination: '/profile.html' },
    { source: '/view-source', destination: 'https://github.com/vercel/vercel' },
  ],
});

const config = { version: 3, routes };
writeFileSync('.vercel/output/config.json', JSON.stringify(config));
```

And the `cleanUrls` special case, verbatim:

> "The `cleanUrls: true` routing feature is a special case because, in addition to the routes
> generated with the helper function above, it *also* requires that the static HTML files have their
> `.html` suffix removed. This can be achieved by utilizing the `"overrides"` property in the
> `config.json` file"

```typescript
const { routes } = getTransformedRoutes({ cleanUrls: true });

const config = {
  version: 3,
  routes,
  overrides: { 'blog.html': { path: 'blog' } },
};
```

**This is the single most important gotcha**: `cleanUrls: true` in `getTransformedRoutes` (or in
`vercel.json`) generates the *redirects*, but only `overrides` makes the extensionless path actually
resolve to the file. You need both. Package:
[npmjs.com/package/@vercel/routing-utils](https://www.npmjs.com/package/@vercel/routing-utils).

#### Emission order (verified in source)

From [`packages/routing-utils/src/index.ts`](https://github.com/vercel/vercel/blob/main/packages/routing-utils/src/index.ts),
`getTransformedRoutes` appends in this fixed order:

```
cleanUrls routes
trailingSlash routes
userRoutes (the `routes` you pass in)
redirects
headers            (each gets `continue: true` automatically)
{ handle: 'filesystem' }     <-- ONLY emitted if `rewrites` is defined
rewrites
```

Two consequences worth knowing:
- `getTransformedRoutes({ cleanUrls: true })` with no `rewrites` emits **no** `handle: 'filesystem'`
  marker at all. That is fine — static serving happens after the initial phase regardless — but it
  means you must add the marker yourself if you also want function rewrites.
- `convertHeaders` always sets `continue: true` on the routes it produces, so you never have to
  remember it when you go through the helper.

#### Validation rules the helper enforces (and the platform presumably does too)

From `normalizeRoutes` in the same file — these are real errors, not warnings:
- `handle` routes may carry no other property: "Route at index N has unknown property `X`."
- Each handle value may appear at most once: "Route at index N is a duplicate. Please use one
  `handle: X` at most."
- After `handle: 'hit'`, a route "cannot define `dest`/`destination`", "cannot define
  `status`/`statusCode`", and "must define `continue: true`".
- After `handle: 'miss'`, a route "must define `check: true`" and "must define `continue: true`".

### 1.5 How Vercel picks up a prebuilt `.vercel/output` (verified in source)

Two distinct flows:

**(a) Git-based / dashboard build (the one you want).** The project's framework preset must resolve
to something handled by `@vercel/static-build` — i.e. **Other** (`framework: null`). After running
your build command, `static-build` checks for the output directory and short-circuits.

From `packages/static-build/src/index.ts`
([source](https://github.com/vercel/vercel/blob/main/packages/static-build/src/index.ts)):

```ts
const outputDirPrefix = path.join(workPath, path.dirname(entrypoint));
distPath = (await getUpdatedDistPath(framework, outputDirPrefix, entrypointDir, distPath, config)) || distPath;

// If the Build Command or Framework output files according to the
// Build Output v3 API, then stop processing here in `static-build`
// since the output is already in its final form.
const buildOutputPathV3 = await BuildOutputV3.getBuildOutputDirectory(outputDirPrefix);
if (buildOutputPathV3) {
  return BuildOutputV3.createBuildOutput(meta, buildCommand, buildOutputPathV3, framework);
}
```

And the detection itself, `packages/static-build/src/utils/build-output-v3.ts`
([source](https://github.com/vercel/vercel/blob/main/packages/static-build/src/utils/build-output-v3.ts)):

```ts
const BUILD_OUTPUT_DIR = '.vercel/output';

/**
 * Returns the path to the Build Output API v3 directory when the
 * `config.json` file was created by the framework / build script,
 * or `undefined` if the framework did not create the v3 output.
 */
export async function getBuildOutputDirectory(path: string): Promise<string | undefined> {
  const outputDir = join(path, BUILD_OUTPUT_DIR);
  const configPath = join(outputDir, 'config.json');
  await fs.stat(configPath);
  return outputDir;
}
```

Concrete consequences, all confirmed by reading that code:

- **The trigger is literally the existence of `<root>/.vercel/output/config.json`.** Nothing else.
- `outputDirPrefix` is `workPath + dirname(entrypoint)` where the entrypoint is `package.json`, i.e.
  the **project root after the Root Directory setting is applied**.
- The **`outputDirectory` project setting is irrelevant** when BOA v3 output is present: the early
  `return` happens before `validateDistDir(distPath, workPath)` is ever called. You do not need to
  set it, and setting it does not break anything.
- The `cache` array is read separately via `BuildOutputV3.readConfig(workPath)`.
- `createBuildOutput` **throws under `vercel dev`**:
  `"Detected Build Output v3 from ${buildCommandName}, but it is not supported for \`vercel dev\`. Please set the Development Command in your Project Settings."`

So: **no special `vercel.json` key is needed to opt into the Build Output API.** There is no
`"buildOutput": true` flag. The minimum config is:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "buildCommand": "node ./build.mjs"
}
```

`framework: null` is documented: "To select 'Other' as the Framework Preset, use `null`."
([/docs/project-configuration/vercel-json#framework](https://vercel.com/docs/project-configuration/vercel-json))

**(b) Local / CI build.** `vercel build` writes `.vercel/output` itself (running your build command
inside the same builder pipeline), and `vercel deploy --prebuilt` uploads it. From
[/docs/cli/build](https://vercel.com/docs/cli/build) (last_updated 2026-08-11): "Build artifacts are
placed into the `.vercel/output` directory according to the Build Output API… When used in
conjunction with the `vercel deploy --prebuilt` command, this allows a Vercel Deployment to be
created *without* sharing the Vercel Project's source code with Vercel." Recommended to run
`vercel pull` first. Flags: `--prod`, `--yes`, `--target=<env>`, `--output <dir>`.

Caveat from [/docs/cli/deploy](https://vercel.com/docs/cli/deploy): "When using the `--prebuilt`
flag, System Environment Variables will be missing at build time." Also known-limitations note on
the BOA index page: "when building locally, your build tools will compile native dependencies
targeting your machine's architecture. This will not necessarily match what runs in production."

---

## 2. `vercel.ts` / `@vercel/config`

Source: [/docs/project-configuration/vercel-ts](https://vercel.com/docs/project-configuration/vercel-ts)
(last_updated **2026-08-25** — this is new and current).

### 2.1 Shape

> "The `vercel.ts` file lets you configure and override the default behavior of Vercel from within
> your project. Unlike `vercel.json`, which is static, `vercel.ts` executes at build time, which lets
> you dynamically generate configuration."

Requirements, verbatim: **"Use only one configuration file: `vercel.ts` or `vercel.json`."** and
"the final set of rules and configuration properties must be in a `config` struct export."

Install: `pnpm i @vercel/config`. Also accepts `vercel.js`, `vercel.mjs`, `vercel.cjs`, `vercel.mts`.

```typescript filename="vercel.ts"
import { routes, deploymentEnv, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  buildCommand: 'npm run build',
  framework: 'nextjs',
  rewrites: [ routes.rewrite('/api/(.*)', 'https://backend.api.example.com/$1') ],
  redirects: [ routes.redirect('/old-docs', '/docs', { permanent: true }) ],
  headers: [
    routes.cacheControl('/static/(.*)', { public: true, maxAge: '1 week', immutable: true }),
  ],
  crons: [{ path: '/api/cleanup', schedule: '0 0 * * *' }],
};
```

Full option list (verbatim from "Config export options"): `buildCommand`, `bunVersion`, `cleanUrls`,
`crons`, `devCommand`, `fluid`, `framework`, `functions`, `headers`, `ignoreCommand`, `images`,
`installCommand`, `outputDirectory`, `public`, `redirects`, `bulkRedirectsPath`, `regions`,
`functionFailoverRegions`, `rewrites`, `trailingSlash`, `legacy`.

Notably **there is no `routes` in the `vercel.ts` option list** — it is under "Legacy properties",
which defers to the vercel.json reference. So `vercel.ts` is deliberately the *high-level* surface.

### 2.2 Can it express `framework: null` + build command + output? Yes.

- `framework`: **Type `string | null`**, and "To select 'Other' as the Framework Preset, use `null`."
- `buildCommand`: **Type `string | null`**, "override[s] the Build Command in the Project Settings
  dashboard, and the `build` script from the `package.json`".
- `outputDirectory`: **Type `string | null`**.

So the minimal bespoke-framework config is:

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: null,
  buildCommand: 'node ./build.mjs',
  // outputDirectory is unnecessary — ignored once .vercel/output/config.json exists (§1.5)
};
```

### 2.3 Coexistence with the Build Output API

This is the part the docs do **not** state explicitly, so read it carefully:

- `vercel.ts` / `vercel.json` configure the **project/deployment** (which builder runs, what command,
  plus a *project-level* route table).
- `.vercel/output/config.json` configures the **deployment output** (the deployment-level route
  table, images, overrides).
- They are different layers. Vercel's routing docs describe the request path as "firewall → project
  routes → deployment routes" ([/docs/routing](https://vercel.com/docs/routing)), so project-level
  rules from `vercel.ts` are evaluated **before** the deployment routes your `config.json` emits.

**Practical recommendation:** put *everything routing-shaped* in `.vercel/output/config.json` (which
your generator writes, and which is versioned with the deployment output), and keep `vercel.ts`/
`vercel.json` down to `framework: null` + `buildCommand`. Mixing the two means two route tables that
you have to reason about jointly, and `cleanUrls: true` at the `vercel.ts` layer will emit
redirect routes that fight the ones you emit yourself.

### 2.4 Precedence between `vercel.ts` routes and `config.json` routes — resolved from source

The docs don't spell this out, but the merge is deterministic and I traced it.

Layer order overall, from [/docs/routing](https://vercel.com/docs/routing) (last_updated 2026-08-11):
bulk redirects → **Project Routes** (dashboard/API-managed, `vercel routes` CLI) → **deployment
routes**. Note that `vercel.json`/`vercel.ts` rules are *deployment*-level, not "Project Routes":
"Project Routes are project-level routing rules you configure from the dashboard or API. They run
after bulk redirects and before your deployment's own routes."

Within the deployment layer, `vercel.json`/`vercel.ts` rules and your `config.json` routes are
**merged**, not one-or-the-other. In
[`packages/cli/src/commands/build/index.ts`](https://github.com/vercel/vercel/blob/main/packages/cli/src/commands/build/index.ts):

```ts
const routesResult = getTransformedRoutes(localConfig);   // <- vercel.json / vercel.ts
// ...
let mergedBuildResult: BuildResult | BuildOutputConfig = buildResult;
if ('buildOutputPath' in buildResult) {
  // reads YOUR .vercel/output/config.json and stores it as the build result
  const buildOutputConfig = await readJSONFile<BuildOutputConfig>(buildOutputConfigPath);
  mergedBuildResult = buildOutputConfig;
}
// ...
const builderRoutes = Array.from(topLevelBuildResults.entries())
  .filter(b => 'routes' in b[1] && Array.isArray(b[1].routes))   // <- your config.json routes qualify
  .map(/* ... */);

let mergedRoutes = mergeRoutes({ userRoutes: routesResult.routes, builds: builderRoutes });
```

And `mergeRoutes` ([`packages/routing-utils/src/merge.ts`](https://github.com/vercel/vercel/blob/main/packages/routing-utils/src/merge.ts))
interleaves them **per handle phase** in this exact order:

```ts
for (const handle of uniqueHandleValues) {
  const userRoutes    = userHandleMap.get(handle) || [];      // vercel.json / vercel.ts
  const builderRoutes = builderHandleMap.get(handle) || [];   // your config.json
  const builderSorted = getCheckAndContinue(builderRoutes);
  if (handle !== null && (userRoutes.length > 0 || builderRoutes.length > 0)) {
    outputRoutes.push({ handle });
  }
  outputRoutes.push(...builderSorted.continues);   // 1. your `continue: true` routes
  outputRoutes.push(...userRoutes);                // 2. vercel.json / vercel.ts routes
  outputRoutes.push(...builderSorted.checks);      // 3. your `check: true` routes
  outputRoutes.push(...builderSorted.others);      // 4. your remaining routes
}
```

**So, within each phase: your `continue: true` routes run first, then the `vercel.json`/`vercel.ts`
rules, then the rest of yours.** Concretely: a `Cache-Control` header route you emit in `config.json`
(which carries `continue: true`) beats a `vercel.json` `headers` entry for the same path, but a
`vercel.json` `redirects` entry beats a terminating redirect route in your `config.json`.

Caveat: this is the `vercel build` CLI code path. Cloud builds run the same builders and, as of the
`vercel build` unification, essentially the same merge, but I did not verify the cloud path
byte-for-byte — treat the *ordering rule* as verified and the *identical-code claim* as
**UNVERIFIED**.

This is another reason to keep `vercel.ts` to `framework` + `buildCommand` only: one route table is
much easier to reason about than an interleaved two.

**UNVERIFIED:** whether `images` set in `vercel.ts` merges with, overrides, or is overridden by
`images` in `.vercel/output/config.json`. Both places accept the same shape. Set it in exactly one
place (recommend `config.json`).

---

## 3. Image optimization for a non-Next framework

### 3.1 It is enabled purely by the `images` key — confirmed

From [/docs/build-output-api/configuration#images](https://vercel.com/docs/build-output-api/configuration),
verbatim:

> "When the `images` property is defined, the Image Optimization API will be available by visiting the
> `/_vercel/image` path. When the `images` property is undefined, visiting the `/_vercel/image` path
> will respond with 404 Not Found."

Query parameters, verbatim from the docs table:

| Key | Required | Example | Description |
|---|---|---|---|
| `url` | Yes | `/assets/me.png` | "The URL of the source image that should be optimized. Absolute URLs must match a pattern defined in the `remotePatterns` configuration." |
| `w` | Yes | `200` | "The width (in pixels) that the source image should be resized to. **Must match a value defined in the `sizes` configuration.**" |
| `q` | Yes | `75` | "The quality that the source image should be reduced to. Must be between 1 (lowest quality) to 100 (highest quality)." |

Plus, from the schema: `qualities` — "Allowed image qualities. Leave undefined to allow all
possibilities, 1 to 100." So if you *do* set `qualities`, `q` must be in that list too.

There is **no framework requirement whatsoever** — Vercel's own
[`build-output-api/image-optimization`](https://github.com/vercel/examples/tree/main/build-output-api/image-optimization)
example is a bare `.vercel/output` with one `index.html` and no framework, no functions, and no
build step. Its config is:

```json
{
  "version": 3,
  "images": {
    "sizes": [256, 384, 600, 1000],
    "domains": [],
    "minimumCacheTTL": 60,
    "formats": ["image/webp", "image/avif"]
  }
}
```

and its markup is hand-written:

```html
<img src="/_vercel/image?url=%2Fimages%2Frio.jpeg&w=1000&q=75" width="500" height="375" />
```

with the README noting: "This image was uploaded to Vercel as a 3.9mb unoptimized image, but when
served via Image Optimization it is resized and served with the optimal image format for your web
browser, making it ~100kb."

Note the `url` value is **percent-encoded** (`%2Fimages%2Frio.jpeg`). Do that; a raw `/` mostly works
but breaks the moment the path contains a `&`, `?`, `#` or a space.

### 3.2 Pattern declaration and regex semantics — a real footgun

```ts
type RemotePattern = {
  protocol?: 'http' | 'https';
  hostname: string;   // REQUIRED
  port?: string;
  pathname?: string;
  search?: string;
};
type LocalPattern = { pathname?: string; search?: string };
```

The documented example makes the semantics unambiguous:

```json
"localPatterns": [{ "pathname": "^/assets/.*$", "search": "" }],
"remotePatterns": [{
  "protocol": "https",
  "hostname": "^via\\.placeholder\\.com$",
  "port": "",
  "pathname": "^/1280x640/.*$",
  "search": "?v=1"
}]
```

**`hostname` and `pathname` in `.vercel/output/config.json` are regular expressions**, anchored with
`^`/`$` and with literal dots escaped — *not* the glob-ish `**`/`*` wildcards that `next.config.js`'s
`remotePatterns` uses. Copying a Next.js `remotePatterns` block verbatim into a Build Output
`config.json` will silently fail to match. The same regex form is documented for
[`vercel.ts` `images`](https://vercel.com/docs/project-configuration/vercel-ts) (`hostname: 'example.com'`,
`pathname: '^/account123/.*$'`) — note that page's example leaves `hostname` unanchored, which as a
regex still matches by substring.

`localPatterns` semantics, verbatim: "Leave undefined to allow all or use empty array to deny all."
`domains`: "Allowed external domains that can use Image Optimization. **Leave empty for only allowing
the deployment domain** to use Image Optimization." — so for a blog serving only its own images,
`"domains": []` is exactly right and no `remotePatterns` are needed.

Other fields: `formats` (`'image/avif' | 'image/webp'` only), `minimumCacheTTL` (seconds),
`dangerouslyAllowSVG` ("disabled by default for security purposes"), `contentSecurityPolicy`
(recommended value from the vercel.ts docs: `"script-src 'none'; frame-src 'none'; sandbox;"`),
`contentDispositionType` (`"inline"` or `"attachment"`).

### 3.3 Hand-written `srcset`

There is no first-party helper for non-Next frameworks, so generate the URLs in your templating
layer. A correct, CLS-free pattern:

```html
<img
  src="/_vercel/image?url=%2F_assets%2Fhero.png&w=1200&q=75"
  srcset="
    /_vercel/image?url=%2F_assets%2Fhero.png&w=640&q=75   640w,
    /_vercel/image?url=%2F_assets%2Fhero.png&w=828&q=75   828w,
    /_vercel/image?url=%2F_assets%2Fhero.png&w=1200&q=75 1200w,
    /_vercel/image?url=%2F_assets%2Fhero.png&w=1920&q=75 1920w"
  sizes="(max-width: 700px) 100vw, 700px"
  width="1200" height="675"
  alt="…"
  loading="lazy" decoding="async" />
```

Rules that follow directly from the docs:
- Every `w` in the `srcset` **must** appear in `images.sizes`, or that candidate 400s.
- `q` must be in `images.qualities` if you set that array. Pick one quality and use it everywhere.
- Do **not** hand-write `<picture>` with separate avif/webp `<source>`s — the optimizer already does
  format negotiation from the request's `Accept` header, which is why `formats` exists. One `<img>`
  is correct and simpler.
- Always set `width`/`height` (or `aspect-ratio` in CSS) — the optimizer does not communicate
  intrinsic size to the browser.
- In your `config.json`, add `"localPatterns": [{ "pathname": "^/_assets/.*$", "search": "" }]` to
  stop the endpoint from being usable as an open resizer for arbitrary paths on your own domain.

### 3.4 Pricing (2026)

[/docs/image-optimization/limits-and-pricing](https://vercel.com/docs/image-optimization/limits-and-pricing),
**last_updated 2026-08-11**. This is the transformation-based model (the older "source images" model
is [legacy](https://vercel.com/docs/image-optimization/legacy-pricing) and only survives for
Enterprise contracts predating 2025-02-18).

| Image Usage | Hobby Included | On-demand Rates |
|---|---|---|
| Image transformations | 5K/month | $0.05 – $0.0812 per 1K |
| Image cache reads | 300K/month | $0.40 – $0.64 per 1M |
| Image cache writes | 100K/month | $4.00 – $6.40 per 1M |

(Rate ranges are regional — see [/docs/pricing/regional-pricing](https://vercel.com/docs/pricing/regional-pricing).
**UNVERIFIED:** the *Pro* included allowances; that table only publishes the Hobby column, and the
Pro numbers live on [/docs/pricing](https://vercel.com/docs/pricing).)

What actually gets billed, verbatim:
- **Transformations**: "billed for every cache MISS and STALE." Not per request.
- **Cache reads**: "measured in 8KB units… *not* billed for every cache HIT, only when the image
  needs to be retrieved from the shared global cache. An image that has been accessed recently
  (several hours ago) in the same region will be cached in region and does *not* incur this cost."
- **Cache writes**: "measured in 8KB units. It is billed for every cache MISS and STALE."
- Plus Fast Data Transfer and Edge Requests for delivery.

**Hobby overage behaviour** (this is the one to plan around): "New images will fail to optimize and
instead return a runtime error response with **402 status code**… Previously optimized images have
already been cached and will continue to work as expected, without error." And: "You will **not** be
charged for exceeding the usage limits."

Practical read for a personal blog: the transformation budget is generous *if* your `sizes` array is
small. Every distinct (url, w, q, output-format) tuple is a separate cache key, so a 6-entry `srcset`
across avif+webp is up to 12 transformations per source image on first view. **Keep `sizes` to 4–5
widths and `qualities` to a single value** and you will not get near 5K/month. Setting a long
`minimumCacheTTL` (e.g. `31536000` for content-hashed assets) directly reduces STALE-driven
re-transformations.

Hard limits: transformed image max **10 MB**; source image max **8192 px** in either dimension;
source must be `image/jpeg`, `image/png`, `image/webp` or `image/avif` — "Other formats will be
served as-is." (So SVG is never optimized regardless of `dangerouslyAllowSVG`, which only controls
whether the endpoint will *accept* an SVG URL at all.)

Also note the Hobby fair-use clause: "Hobby teams are restricted to non-commercial personal use only."

### 3.5 Build-time OG image generation with `@vercel/og` — verified, and it works

**Short answer: yes, `@vercel/og`'s `ImageResponse` runs in plain Node at build time and writes real
PNGs to disk. Generating ~45 of them costs about 0.2 seconds. This is a non-issue.**

This was verified two ways: by inspecting the published tarball, and by actually installing and
running it (empirical run done on Node 23.5.0 darwin-arm64; the Vercel build container is Node 24 on
Amazon Linux 2023 — see the Node-24 caveat below).

**Package facts** (from `npm pack @vercel/og@1.0.2` and the registry):

```json
{
  "name": "@vercel/og", "version": "1.0.2", "type": "module",
  "main": "./dist/index.node.js",
  "exports": { ".": {
    "edge": "./dist/index.edge.js", "edge-light": "...", "browser": "...",
    "worker": "...", "workerd": "...",
    "import": "./dist/index.node.js",
    "node":   "./dist/index.node.js",     // ← a real Node condition
    "default":"./dist/index.node.js"
  }},
  "dependencies":         { "satori": "0.33.3", "@resvg/resvg-wasm": "2.4.1" },
  "optionalDependencies": { "sharp": "^0.35.3" },
  "engines": { "node": ">=22" }
}
```

Shipped files include `dist/yoga.wasm`, `dist/resvg.wasm` and `dist/Geist-Regular.ttf` — i.e. **the
WASM is vendored in the package**; there is nothing to fetch or compile. Note it depends on
`@resvg/resvg-**wasm**`, not the napi build, so there are no platform binaries and no node-gyp.

Docs agree ([/docs/og-image-generation](https://vercel.com/docs/og-image-generation), last_updated
2026-06-16): "Vercel OG image generation is supported on the Node.js runtime" and "@vercel/og uses
Satori and Resvg to convert HTML and CSS into PNG".

`ImageResponse` **extends `Response`**, so writing to disk is:

```js
const res = new ImageResponse(element, { width: 1200, height: 630, fonts })
await fs.writeFile(out, Buffer.from(await res.arrayBuffer()))
```

There is also `unstable_createNodejsStream(element, options): Promise<Readable>` in
`dist/index.node.d.ts` if you'd rather pipe to `fs.createWriteStream`.

#### The one sharp edge: an ESM/CJS shim is required

`dist/index.node.js` is an ESM bundle that inlines harfbuzzjs (an Emscripten module) which calls
`require('fs')` and reads `__dirname`. Under plain ESM both are undefined and it throws:

```
Error: Dynamic require of "fs" is not supported
ReferenceError: __dirname is not defined
```

Confirmed working workaround:

```js
import { createRequire } from 'node:module'
import path from 'node:path'

const require_ = createRequire(import.meta.url)
globalThis.require    = require_
globalThis.__dirname  = path.dirname(require_.resolve('harfbuzzjs/index.js'))
globalThis.__filename = require_.resolve('harfbuzzjs/index.js')

const { ImageResponse } = await import('@vercel/og')  // dynamic, AFTER the shims
```

(Or just run the generator as CommonJS and skip the whole thing.)

#### Measured throughput, 45 images at 1200×630

| Approach | First image | 45 images | Per image |
|---|---|---|---|
| `@vercel/og` `ImageResponse` | 84 ms | **197 ms** | ~4 ms |
| `satori` + `@resvg/resvg-js` (napi) | 1406 ms | 4283 ms | ~95 ms |

Both produce valid `PNG image data, 1200 x 630, 8-bit/color RGBA, non-interlaced`. The `og` path is
faster mainly because it caches font parsing and WASM init across calls (the satori loop re-parsed
the font buffer each iteration and could be optimised to match).

Against Vercel's **45-minute build limit** ([/docs/limits](https://vercel.com/docs/limits), all
plans) on a **standard build machine of 4 vCPU / 8 GB RAM / 32 GB disk**
([/docs/builds/managing-builds](https://vercel.com/docs/builds/managing-builds)), 45 PNGs is a
rounding error.

#### Alternatives and their risk

- **`satori` + `@resvg/resvg-js` (napi).** AL2023 is glibc, so npm resolves the prebuilt
  `@resvg/resvg-js-linux-x64-gnu` optional dependency — no compilation, no node-gyp.
  **UNVERIFIED on Node 24**: resvg-js's README documents Node 12–22, and its latest release
  (2.6.2) is from 2024-03-26. napi-rs binaries are ABI-stable across Node majors so it should be
  fine, but it was not tested on 24. `@vercel/og`'s WASM resvg sidesteps this entirely — that is the
  argument for the `og` path if you want zero native-module risk in the build container.
- **`sharp`** — fine for resizing/format conversion, but it does not render HTML/CSS, so it is not a
  substitute for satori. (It is an *optional* dep of `@vercel/og`.)

#### Correction on yoga

`satori` **0.33.4** (published 2026-08-24) depends on **`yoga-layout`**, not `yoga-wasm-web`.
`yoga-wasm-web`'s own latest is 0.3.3 from 2023-03-14 and is effectively unmaintained. `@vercel/og`
1.0.2 pins `satori` 0.33.3 and vendors `yoga.wasm` directly. Any guidance you've seen about installing
`yoga-wasm-web` yourself is out of date.

#### Fonts — the most likely thing to bite

satori accepts **TTF, OTF and WOFF only**. From satori's README: "WOFF2 is not supported at the
moment", repeated in Vercel's docs: "Only ttf, otf, and woff font formats are supported. To maximize
the font parsing speed, ttf or otf are preferred over woff."

Most modern web-font pipelines ship woff2 exclusively, so **a TTF/OTF copy of your display face has
to live in the repo purely for OG generation**. Read it with `fs.readFile` and pass the Buffer
straight into `fonts: [{ name, data, weight, style }]`. If you pass no `fonts` at all, `@vercel/og`
falls back to the `Geist-Regular.ttf` it bundles. (The package README's claim that "only the Noto
Sans font is included" is stale — the dist ships Geist.)

#### Two documented limits that do NOT apply here

1. The 500 KB `@vercel/og` bundle limit applies to the **deployed function bundle**. Generating at
   build time and shipping static PNGs avoids it entirely.
2. The `robots.txt` `Allow: /api/og/*` advice is for **runtime** OG routes. Irrelevant to
   pre-generated files.

Pre-generating is also strictly cheaper: a static PNG in `.vercel/output/static` costs nothing but
bandwidth, whereas a runtime OG route is a function invocation per cache miss.

---

## 4. Functions

### 4.1 `.vc-config.json` — Node.js serverless

Base config, verbatim from [/docs/build-output-api/primitives](https://vercel.com/docs/build-output-api/primitives):

```ts
type ServerlessFunctionConfig = {
  handler: string;
  runtime: string;
  memory?: number;
  maxDuration?: number;
  environment: Record<string, string>[];
  regions?: string[];
  supportsWrapper?: boolean;
  supportsResponseStreaming?: boolean;
};

type NodejsServerlessFunctionConfig = ServerlessFunctionConfig & {
  launcherType: 'Nodejs';
  shouldAddHelpers?: boolean;          // default: false
  shouldAddSourcemapSupport?: boolean; // default: false
};
```

Also documented in the table but missing from the TS type: `architecture` ("Either `x86_64` or
`arm64`. The default value is `x86_64`") and `awsLambdaHandler`.

Field meanings, verbatim:
- `runtime`: "Specifies which 'runtime' will be used to execute the Vercel Function."
- `handler`: "Indicates the initial file where code will be executed."
- `memory`: MB of RAM.
- `maxDuration`: seconds.
- `regions`: "List of Vercel Regions where the Vercel Function will be deployed to."
- `supportsResponseStreaming`: "When true, the Vercel Function will stream the response to the client."
- `launcherType`: `"Nodejs"` — "Currently only 'Nodejs' is supported."
- `shouldAddHelpers`: "Enables request and response helpers methods." (`req.query`, `req.cookies`,
  `req.body`, `res.status()`, `res.send()`, `res.json()`, `res.redirect()` — see
  [/docs/functions/runtimes/node-js](https://vercel.com/docs/functions/runtimes/node-js))
- `shouldAddSourcemapSupport`: "Enables source map support for stack traces at runtime."

Docs' own example (note it still shows `nodejs22.x`):

```json
{
  "runtime": "nodejs22.x",
  "handler": "serve.js",
  "maxDuration": 3,
  "launcherType": "Nodejs",
  "shouldAddHelpers": true,
  "shouldAddSourcemapSupport": true
}
```

### 4.2 Is `nodejs24.x` valid? Yes.

[/docs/functions/runtimes/node-js/node-js-versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
(last_updated 2026-02-27): "Current available versions are: **24.x** (default), **22.x**, **20.x**."
Node 20 is being deprecated on 2026-10-01
([changelog](https://vercel.com/changelog/node-js-20-is-being-deprecated)).

Corroborated by SvelteKit's adapter, which validates the exact runtime strings
([`packages/adapter-vercel/utils.js`](https://github.com/sveltejs/kit/blob/main/packages/adapter-vercel/utils.js)):

```js
const valid_node_versions = [20, 22, 24];
const valid_runtimes = ['nodejs20.x', 'nodejs22.x', 'nodejs24.x', 'bun1.x', 'edge'];

function get_default_runtime() {
  const major = Number(process.version.slice(1).split('.')[0]);
  // ...
  return `nodejs${major}.x`;
}
```

i.e. derive the runtime string from `process.version` at build time. That is a good pattern to copy.

Version selection for the *build container* and default function runtime: project settings dropdown,
overridable via `package.json`:

```json
{ "engines": { "node": "24.x" } }
```

"when you set the Node.js version to **20.x** in the **Project Settings** and you specify a valid
semver range for **Node.js 24** in `package.json`, your project will be deployed with the latest
24.x version." Note that with the Build Output API, the *function* runtime comes from your
`.vc-config.json` `runtime` string, not from `engines` — `engines` governs the build container.

### 4.3 Handler signature

**Verified**: the Node `(req, res)` signature. Vercel's own Build Output API example
([vercel/examples `build-output-api/serverless-functions`](https://github.com/vercel/examples/tree/main/build-output-api/serverless-functions)):

```json
{ "runtime": "nodejs20.x", "handler": "index.js", "launcherType": "Nodejs", "shouldAddHelpers": true }
```
```js
const cowsay = require('cowsay')

module.exports = (req, res) => {
  const { name = 'friend' } = req.query
  // ...
  res.setHeader('Content-Type', 'text/plain')
  res.end(body)
}
```

SvelteKit's adapter does the same — it generates a shim that ends in
([`adapter-vercel/index.js`](https://github.com/sveltejs/kit/blob/main/packages/adapter-vercel/index.js)):

```js
export default async (req, res) => {
  const { default: handler } = await promise;
  return handler(req, res);
}
```

**`export default (req: Request) => Response` with a raw `.vc-config.json`: UNVERIFIED, and I
recommend against relying on it.** The dual-signature detection (web handlers via `fetch`,
`GET`/`POST` exports, or a captured `server.listen()`) lives in
[`packages/node/src/serverless-functions/serverless-handler.mts`](https://github.com/vercel/vercel/blob/main/packages/node/src/serverless-functions/serverless-handler.mts):

```ts
const shouldUseWebHandlers =
  options.isMiddleware ||
  HTTP_METHODS.some(method => typeof listener[method] === 'function') ||
  typeof listener.fetch === 'function';
```

…but that file is part of the **`@vercel/node` builder**, which wraps your `/api/*.ts` sources into a
`.func` with a generated launcher. When you write the `.func` yourself and set
`launcherType: "Nodejs"`, the platform's own launcher is what runs, and it is not open source. Every
first-party example and every adapter I inspected uses `(req, res)`.

**Recommendation:** write `(req, res)` and adapt to `Request`/`Response` yourself inside the handler
if you prefer web semantics — a ~20-line shim. That is exactly what Astro/SvelteKit/Nitro do.

### 4.4 Fluid compute

[/docs/fluid-compute](https://vercel.com/docs/fluid-compute) (last_updated 2026-08-24):

> "As of April 23, 2025, fluid compute is enabled by default for new projects."

It is a **project-level** setting (dashboard → Functions Settings, or `fluid: true` in
`vercel.json`/`vercel.ts`), not something you declare per-`.vc-config.json`. It applies to Node.js,
Python, Edge, Bun and Rust runtimes. So a Build Output API Node function on a new project gets Fluid
automatically. Fluid defaults by plan:

| Setting | Hobby | Pro |
|---|---|---|
| CPU configuration | Standard | Standard / Performance |
| Default / max duration | 300s / 300s | 300s / 800s (1800s extended, beta) |
| Multi-region functions | – | Up to 3 |

Precedence: function code > `vercel.json` > dashboard > fluid defaults.

**UNVERIFIED:** whether a `memory` value in a hand-written `.vc-config.json` is honoured under
Fluid. The `vercel.ts` docs say "Memory cannot be set in `vercel.ts` with Fluid compute enabled.
Instead set it in the **Functions** section in your project dashboard sidebar." Whether the same
restriction applies to the BOA-level `memory` field is not documented.

Relevant limits ([/docs/functions/limitations](https://vercel.com/docs/functions/limitations), last_updated 2026-08-24):
max uncompressed bundle **250 MB** (5 GB with the large-functions beta); memory Hobby 2 GB / Pro 4 GB;
request+response body **4.5 MB**; function name max 128 chars, no spaces; default region `iad1`.

### 4.5 Prerender / ISR

Sibling file `<name>.prerender-config.json` next to `<name>.func`:

```ts
type PrerenderFunctionConfig = {
  expiration: number | false;   // REQUIRED. false = never expires
  group?: number;
  bypassToken?: string;
  fallback?: string;
  allowQuery?: string[];
  passQuery?: boolean;
  initialHeaders?: Record<string, string>;
  initialStatus?: number;
  exposeErrBody?: boolean;
};
```

Verbatim field notes:
- `expiration`: "Expiration time (in seconds) before the cached asset will be re-generated by
  invoking the Vercel Function. Setting the value to `false` means it will never expire."
- `group`: "Prerender assets with the same group number will all be re-validated at the same time."
- `bypassToken`: "Random token assigned to the `__prerender_bypass` cookie when Draft Mode is enabled."
- `fallback`: "Name of the optional fallback file relative to the configuration file."
- `allowQuery`: "List of query string parameter names that will be cached independently. If an empty
  array, query values are not considered for caching. If undefined each unique query value is cached
  independently."
- `passQuery`: "When true, the query string will be present on the `request` argument passed to the
  invoked function. The `allowQuery` filter still applies."
- `initialHeaders` / `initialStatus` / `exposeErrBody`.

Real example ([vercel/examples `build-output-api/prerender-functions`](https://github.com/vercel/examples/tree/main/build-output-api/prerender-functions)):

```json
{
  "expiration": 5,
  "group": 1,
  "bypassToken": "2ec9172003a647b296f324848dd3d407",
  "allowQuery": ["slug"],
  "fallback": "post.prerender-fallback.html"
}
```

**On-demand revalidation** ([/docs/build-output-api/features](https://vercel.com/docs/build-output-api/features)):
"make a `GET` or `HEAD` request to that path with a header of `x-prerender-revalidate: <bypassToken>`."
**Draft mode**: set cookie `__prerender_bypass` to the `bypassToken`.

For a blog that fully prerenders at build time you probably don't need any of this — but it is the
escape hatch if you later want e.g. a stats page or an OG-image endpoint that regenerates hourly
without a rebuild.

---

## 5. Static hosting specifics

### 5.1 Brotli — yes, automatic

[/docs/how-vercel-cdn-works/compression](https://vercel.com/docs/how-vercel-cdn-works/compression)
(last_updated 2026-03-05): "Vercel helps reduce data transfer and improve performance by supporting
both Gzip and Brotli compression… If your client supports brotli, it takes precedence over gzip."
It is driven purely by the request's `Accept-Encoding`; no build-side action needed.

But compression is **allowlisted by MIME type**. The documented list:

- application: `json`, `x-web-app-manifest+json`, `geo+json`, `manifest+json`, `ld+json`, `atom+xml`,
  `rss+xml`, `xhtml+xml`, `xml`, `rdf+xml`, `javascript`, `tar`, `vnd.ms-fontobject`, `wasm`
- font: `otf`, `ttf`
- image: `svg+xml`, `bmp`, `x-icon`
- text: `cache-manifest`, `css`, `csv`, `dns`, `javascript`, `plain`, `markdown`, `vcard`,
  `calendar`, `vnd.rim.location.xloc`, `vtt`, `x-component`, `x-cross-domain-policy`

**Ambiguity worth flagging:** `text/html` is *not* in that published list even though the page's own
intro says "compress files, such as HTML, CSS, and JavaScript". Empirically HTML *is* compressed
(I did not get `content-encoding` on a HIT-cached HTML response in my spot check, but Vercel's own
marketing numbers quote "HTML files are 21% smaller than gzip"). Treat the published list as
incomplete rather than authoritative. Two practical consequences:
- `woff2` is not on the list — correct, it is already compressed.
- **`font/woff` and `font/woff2` are not listed but `font/otf` and `font/ttf` are** — so serve woff2
  and don't worry.

Live check against the current maxleiter.com (2026-08-30), for calibration:

```
GET /_next/static/immutable/chunks/013lbm4evavf-.css
  cache-control: public,max-age=31536000,immutable
  content-encoding: br
GET /feed.xml
  content-type: application/xml
  content-encoding: br
  cache-control: public, max-age=0, must-revalidate
```

### 5.2 Default `Cache-Control` for static files

[/docs/caching/cache-control-headers](https://vercel.com/docs/caching/cache-control-headers)
(last_updated 2026-08-11): "The default value is `cache-control: public, max-age=0, must-revalidate`
which instructs both the CDN and the browser not to cache."

Empirically confirmed on maxleiter.com for plain static assets (`/favicon.ico`, `/robots.txt`,
`/feed.xml`) — all `public, max-age=0, must-revalidate`, yet `x-vercel-cache: HIT`. So the CDN does
still serve them from its own cache (they're immutable within a deployment); the header only stops
*browser* caching.

Override with a `routes` entry carrying `headers` + `"continue": true` (as in §1.3), or with the
targeted headers:
- `Vercel-CDN-Cache-Control` — highest priority, Vercel-only, stripped before reaching the client.
- `CDN-Cache-Control` — second, "always overrides `Cache-Control`".
- `Cache-Control` — last; "If only `Cache-Control` is used, Vercel strips the `s-maxage` directive
  from the header before it's sent to the client."

Recommended value for content-hashed assets, verbatim from the docs table:
`max-age=31536000, immutable`.

Reserved headers you cannot set: `x-matched-path`, `server`, `content-length`.

### 5.3 `cleanUrls` / `trailingSlash` — NOT automatic in the Build Output API

There is no `cleanUrls` or `trailingSlash` key in the `config.json` schema. Both exist only in
`vercel.json`/`vercel.ts`. In the Build Output API you must:

1. Emit the redirect routes yourself, or generate them with
   `getTransformedRoutes({ cleanUrls: true, trailingSlash: false })` from `@vercel/routing-utils`.
2. **And** emit `overrides` mapping each `foo.html` → `foo`, because static file names are never
   modified. This is stated explicitly in the features doc (quoted in §1.4).

For reference, the `vercel.json` semantics you are reimplementing
([/docs/project-configuration/vercel-ts](https://vercel.com/docs/project-configuration/vercel-ts)):
- `cleanUrls: true` — "all HTML files and Vercel functions will have their extension removed. When
  visiting a path that ends with the extension, a **308** response will redirect the client to the
  extensionless path."
- `trailingSlash: false` — "visiting a path that ends with a forward slash will respond with a 308
  status code and redirect to the path without the trailing slash."
- `trailingSlash: undefined` (default) — "visiting a path with or without a trailing slash will not
  redirect… This is not recommended because it could lead to search engines indexing two different
  pages with duplicate content."

SvelteKit's adapter is the best worked reference (§7.3): for each prerendered page it pushes
`{ src: path, dest: counterpart_route }` and `{ src: counterpart_route, status: 308, headers: { Location: path } }`,
then `overrides[page.file] = { path: overrides_path }`.

### 5.4 404s

Two documented shapes:

```json
{ "handle": "error" },
{ "src": "/.*", "status": 404, "dest": "/404.html" }
```

or the flat form SvelteKit uses for a targeted case:

```json
{ "src": "/_app/immutable/.+", "status": 404, "headers": { "cache-control": "no-store" }, "continue": false }
```

SvelteKit's inline comment on why that second one exists is a genuinely useful lesson:

> "Prevent incorrect caching: if a request to `/_app/immutable/*` doesn't match a static file, return
> 404 instead of falling through to dynamic routes. Otherwise, we could accidentally immutably cache
> dynamic content served by the fallback function. `no-store` stops the earlier immutable header from
> sticking to this 404, so a missing asset isn't cached for a year."

You want the same guard on `/_assets/*`.

### 5.5 Skew protection

[/docs/skew-protection](https://vercel.com/docs/skew-protection) (last_updated 2026-08-11).

- **Plan gate:** "Skew Protection is available for all deployment environments for **Pro and
  Enterprise** teams." (There is also a "Permissions Required: Skew Protection" banner.) **Not on
  Hobby.**
- Zero-config only for Next.js, SvelteKit, Qwik, Astro, Nuxt.
- For everything else, verbatim: "Other frameworks can implement Skew Protection by checking if
  `VERCEL_SKEW_PROTECTION_ENABLED` has value `1` and then appending the value of
  `VERCEL_DEPLOYMENT_ID` to each request using one of the following options" — `?dpl=` query param,
  `x-deployment-id` header, or the `__vdpl` cookie.
- SvelteKit's implementation is a copyable pattern — it emits a `config.json` route that sets the
  cookie on document requests:

```js
if (process.env.VERCEL_SKEW_PROTECTION_ENABLED) {
  routes.push({
    src: '/.*',
    has: [{ type: 'header', key: 'Sec-Fetch-Dest', value: 'document' }],
    headers: { 'Set-Cookie': `__vdpl=${process.env.VERCEL_DEPLOYMENT_ID}; Path=/; SameSite=Strict; Secure; HttpOnly` },
    continue: true
  });
}
```

- Default max age is one day; auto-extended to 60 days for Googlebot/Bingbot.
- With `--prebuilt`, skew protection needs a custom deployment ID (documented only for Next.js).

**For a static blog with no client-side router, skew protection buys you almost nothing** — full page
loads always get the latest deployment, and there is no client/server contract to skew. The one place
it matters is if your JS chunks are content-hashed and a user has a stale HTML page open; the
`immutable.json` mechanism (§1.1) solves that more directly and is not plan-gated.

---

## 6. Analytics / Speed Insights without Next.js

### 6.1 `@vercel/analytics` — verified against the copy already in this repo

`/Users/max/Documents/maxleiter.com/node_modules/@vercel/analytics` is at **v2.0.1**. Its
`package.json` `exports` map (read directly):

```
"."            → dist/index.mjs           ← framework-agnostic; exports inject(), track(), pageview()
"./react"      → dist/react/index.mjs     ← <Analytics /> component, track()
"./next"       "./nuxt"  "./remix"  "./sveltekit"  "./vue"  "./astro"
"./server"     → server-side track()
```

So there are two viable paths for a bespoke React-rendering SSG.

**(a) Plain, no React needed** — `dist/index.d.ts`:

```ts
type InjectProps = AnalyticsProps & {
  framework?: string;
  disableAutoTrack?: boolean;
  basePath?: string;
};

declare function inject(props?: InjectProps, confString?: string): void;
declare function track(name: string, properties?: Record<string, AllowedPropertyValues>): void;
declare function computeRoute(
  pathname: string | null,
  pathParams: Record<string, string | string[]> | null
): string | null;
```

JSDoc on `disableAutoTrack`, verbatim from the shipped types: *"Whether the injected script should
track page views from pushState events. Disable if route is updated after pushState, a manually call
page pageview()."*

**This is the key answer to the route-tracking question:** the injected script auto-tracks page views
**from `pushState` events**. A static multi-page site with only full document loads therefore needs
nothing — each page load fires its own pageview. You only need `disableAutoTrack` + manual
`pageview()` if you add a client-side router that mutates history before the route is known.

**(b) React component** — `dist/react/index.d.ts`:

```ts
declare function Analytics(props: AnalyticsProps & {
  framework?: string;
  route?: string | null;
  path?: string | null;
  basePath?: string;
  configString?: string;
}): null;
```

`route` and `path` are **optional**. Without them the component reports `window.location.pathname`
as-is, meaning `/blog/modern-irc` and `/blog/other-post` show up as two separate rows rather than
being grouped under `/blog/[slug]`. If you want the grouping, pass
`route="/blog/[slug]"` and `path={actualPath}` — and `computeRoute(pathname, params)` from the root
export exists to derive it. For a personal blog with ~45 posts, per-post rows are arguably what you
want anyway.

`AnalyticsProps` in full: `beforeSend`, `debug`, `mode` (`'auto' | 'development' | 'production'`),
`scriptSrc`, `dsn`, `eventEndpoint`, `viewEndpoint`, `sessionEndpoint`, `endpoint`.

**(c) Script tag only.** The injected script is served by the platform at
`/_vercel/insights/script.js` — a plain `<script defer src="/_vercel/insights/script.js"></script>`
in your generated HTML works with no npm dependency at all. This is the lightest option for a hand-
rolled SSG and is what `inject()` ends up doing.

### 6.2 `@vercel/speed-insights` — verified against the published package

`npm pack @vercel/speed-insights@2.0.0` and reading the shipped `.d.ts` files. Exports map mirrors
analytics exactly: `.` (framework-agnostic), `./react`, `./vue`, `./next`, `./nuxt`, `./astro`,
`./remix`, `./sveltekit`.

Root export (`dist/index.d.ts`):

```ts
interface SpeedInsightsProps {
  dsn?: string;
  sampleRate?: number;      // "When setting to 0.5, 50% of the events will be sent. Defaults to 1."
  route?: string | null;    // "The dynamic route of the page."
  beforeSend?: BeforeSend;
  debug?: boolean;
  scriptSrc?: string;
  endpoint?: string;
}

declare function injectSpeedInsights(
  props?: InjectSpeedInsightsProps,   // + framework?, basePath?
  confString?: string
): { setRoute: (route: string | null) => void } | null;

declare function computeRoute(
  pathname: string | null,
  pathParams: Record<string, string | string[]> | null
): string | null;
```

React export (`dist/react/index.d.ts`):

```ts
declare function SpeedInsights(
  props: SpeedInsightsProps & { framework?: string; basePath?: string; configString?: string }
): JSX.Element | null;

export { SpeedInsights, computeRoute };
```

Same conclusions as analytics: `route` is **optional**, and a static multi-page site with full
document loads needs nothing beyond dropping the component (or a script tag) in. `injectSpeedInsights`
returns a `setRoute` handle for SPA cases; irrelevant here.

`sampleRate` is worth knowing about: Speed Insights is billed/limited by **data points**, so a
`sampleRate: 0.5` halves consumption if you brush against the Hobby allowance.

Docs: [/docs/speed-insights](https://vercel.com/docs/speed-insights),
[/docs/speed-insights/package](https://vercel.com/docs/speed-insights/package).

### 6.3 Dashboard enablement is required AND order-sensitive

Both products must be enabled per-project in the dashboard before the script endpoints serve
anything, and **enabling adds routes to the deployment**, so it only takes effect on the *next*
deployment:

- **Web Analytics**: sidebar → Analytics → select project → Enable. Adds routes scoped at
  `/_vercel/insights/*` and `/<unique-path>/*`, "after your next deployment."
  ([/docs/analytics/quickstart](https://vercel.com/docs/analytics/quickstart))
- **Speed Insights**: sidebar → Speed Insights → Enable. Adds routes at `/_vercel/speed-insights/*`
  and `/<unique-path>/*`, likewise after the next deployment.
  ([/docs/speed-insights/quickstart](https://vercel.com/docs/speed-insights/quickstart))

The documented failure mode from getting the order wrong is a **404 on `script.js`** "due to
deploying the tracking code before enabling Web Analytics." Fix: enable → redeploy → Promote to
Production. ([/docs/analytics/troubleshooting](https://vercel.com/docs/analytics/troubleshooting))

**Neither script is auto-injected for non-Next frameworks.** Every framework tab in both quickstarts
requires an explicit component, function call, or script tag. So this is on you either way — which
is fine, since a hand-rolled generator controls the `<head>`.

### 6.4 Hobby limits (2026)

| | Web Analytics | Speed Insights |
|---|---|---|
| Included | 50,000 events/month | 10,000 events/month, **one project only** |
| Reporting window | 1 month | 7 days |
| Custom events | Not available on Hobby | n/a |
| Overage | Cannot purchase; collection pauses | Recording pauses until next day |

Analytics gives a 3-day grace period past the limit, then collection resumes after 7 days; events
pool across **all** projects on the account. Pro is $0.03 per 1K events.
([/docs/analytics/limits-and-pricing](https://vercel.com/docs/analytics/limits-and-pricing))

Speed Insights on Pro is $10.00 per project per month base plus $0.65 per 10,000 events.
([/docs/speed-insights/limits-and-pricing](https://vercel.com/docs/speed-insights/limits-and-pricing))
This is where `sampleRate` earns its keep.

Both packages are MIT licensed as of v2.

### 6.5 One risk if you hand-write the script tag

`getScriptSrc` in the analytics package still hardcodes a default of `/_vercel/insights/script.js`
(dev: `https://va.vercel-scripts.com/v1/script.debug.js`; with `basePath`:
`{basePath}/insights/script.js`). But the current docs write the path as `/<unique-path>/script.js`
everywhere and describe a v2 "Resilient Intake" mechanism where Vercel substitutes real paths at
build time via a `VERCEL_OBSERVABILITY_CLIENT_CONFIG` JSON blob.

**UNVERIFIED:** whether that build-time substitution happens for a Build Output API deployment with
`framework: null` (and especially for `vercel deploy --prebuilt`). No doc states either way. The
proxy-troubleshooting section still names `/_vercel/insights/*` as a live route to forward, which
supports that path still being served.

**Recommendation:** use the npm package (`inject()` or `<Analytics />`) rather than a hand-written
`<script src>`, so you inherit whatever path logic ships with the package. If you do hardcode,
`/_vercel/insights/script.js` is the conservative choice — and verify it returns 200 on a preview
deployment before trusting it.

---

## 7. Prior art

### 7.1 `vercel/examples` → `build-output-api/`

[github.com/vercel/examples/tree/main/build-output-api](https://github.com/vercel/examples/tree/main/build-output-api)
— referenced from the docs as "complete examples of Build Output API directories". Current contents
(fetched 2026-08-30): `draft-mode`, `edge-functions`, `edge-middleware`, `image-optimization`,
`on-demand-isr`, `overrides`, `prerender-functions`, `routes`, `serverless-functions`,
`static-files`, `wildcard`.

The four that matter for this migration, with their actual contents:

**`static-files`** — the whole config is `{"version": 3}`. Static hosting needs nothing else.

**`overrides`** — the extensionless-HTML and Content-Type mechanism, minimal:

```json
{
  "version": 3,
  "overrides": {
    "data":         { "contentType": "application/json" },
    "another.html": { "path": "something-else" }
  }
}
```
Takeaway: two independent uses of `overrides` in one object — retype an extensionless file, and
remap a `.html` file's URL.

**`serverless-functions`** — `.vercel/output/functions/index.func/`:

```json
{ "runtime": "nodejs20.x", "handler": "index.js", "launcherType": "Nodejs", "shouldAddHelpers": true }
```
```js
const cowsay = require('cowsay')
module.exports = (req, res) => {
  const { name = 'friend' } = req.query   // ← req.query only exists because shouldAddHelpers: true
  res.setHeader('Content-Type', 'text/plain')
  res.end(cowsay.say({ text }))
}
```
Takeaways: CommonJS `module.exports = (req, res)`; `config.json` stays `{"version": 3}` (functions
are discovered by filesystem position, no routes entry needed); dependencies are **vendored into the
`.func` directory**, not resolved from a shared `node_modules`.

**`prerender-functions`** — the closest analogue to a blog with mixed static/ISR pages:

```
static/index.html
static/blog/one.html
static/blog/two.html
functions/blog/post.func/{.vc-config.json,index.js}
functions/blog/post.prerender-config.json
functions/blog/post.prerender-fallback.html
```
```json
// config.json
{
  "version": 3,
  "routes": [
    { "handle": "filesystem" },
    { "src": "/blog/(?<slug>[^/]*)", "dest": "/blog/post?slug=$slug" }
  ],
  "overrides": {
    "blog/one.html": { "path": "blog/one" },
    "blog/two.html": { "path": "blog/two" }
  }
}
```
```json
// post.prerender-config.json
{
  "expiration": 5, "group": 1,
  "bypassToken": "2ec9172003a647b296f324848dd3d407",
  "allowQuery": ["slug"],
  "fallback": "post.prerender-fallback.html"
}
```

**This is exactly the pattern for the target site**: static HTML for known posts, `overrides` to make
them extensionless, `handle: filesystem` first so those win, and a catch-all rewrite after it for
anything not prerendered. `on-demand-isr` is the same shape with a `[slug].func` named literally with
brackets and a slightly different regex: `"src": "/blog/(?<slug>[^/]+)(?:/)?"`.

### 7.2 The `routes` example — the redirect idiom

```json
{
  "version": 3,
  "routes": [
    { "src": "/(.*)", "status": 307, "headers": { "Location": "https://example.com/$1" } }
  ]
}
```
Redirects are `status` + a `Location` header, not a `dest`. Same for `/rss` → `/feed.xml`.

### 7.3 SvelteKit `adapter-vercel` — the best reference implementation

[github.com/sveltejs/kit/blob/main/packages/adapter-vercel/index.js](https://github.com/sveltejs/kit/blob/main/packages/adapter-vercel/index.js)
(+ `utils.js`). Read this one if you read only one. Concrete lessons:

1. **`overrides` for every prerendered page**, plus a paired trailing-slash redirect:

```js
for (const [path, page] of builder.prerendered.pages) {
  let overrides_path = path.slice(1);
  if (path !== '/') {
    let counterpart_route = path + '/';
    if (path.endsWith('/')) { counterpart_route = path.slice(0, -1); overrides_path = path.slice(1, -1); }
    prerendered_redirects.push(
      { src: path, dest: counterpart_route },
      { src: counterpart_route, status: 308, headers: { Location: path } }
    );
  }
  overrides[page.file] = { path: overrides_path };
}
```

2. **Immutable asset headers via a route, not a header on the file:**

```js
{ src: `/${builder.getAppPath()}/immutable/.+`,
  headers: { 'cache-control': 'public, immutable, max-age=31536000' } }
```

3. **A 404 guard *after* `handle: filesystem`** so a missing hashed asset can't be immutably cached.
   Its comment is worth copying verbatim into your generator:

```js
routes.push({ handle: 'filesystem' });

// Prevent incorrect caching: if a request to /_app/immutable/* doesn't match
// a static file, return 404 instead of falling through to dynamic routes.
// Otherwise, we could accidentally immutably cache dynamic content served
// by the fallback function. `no-store` stops the earlier immutable header
// from sticking to this 404, so a missing asset isn't cached for a year.
routes.push({
  src: `/${builder.getAppPath()}/immutable/.+`,
  status: 404, headers: { 'cache-control': 'no-store' }, continue: false
});
```

4. **`.vc-config.json` generation**, including a `package.json` inside the `.func` for ESM:

```js
write(`${dir}/.vc-config.json`, JSON.stringify({
  runtime: config.runtime,          // 'nodejs24.x' etc., derived from process.version
  regions: config.regions,
  memory: config.memory,
  maxDuration: config.maxDuration,
  handler: path.relative(base + ancestor, entry),
  launcherType: 'Nodejs',
  experimentalResponseStreaming: !config.isr,
  framework: { slug: 'sveltekit', version: VERSION }
}, null, '\t'));

write(`${dir}/package.json`, JSON.stringify({ type: 'module' }));
```

Two things to note. First, it still uses the **legacy key `experimentalResponseStreaming`**. That is
now confirmed to be an accepted alias — from
[`packages/build-utils/src/lambda.ts`](https://github.com/vercel/vercel/blob/main/packages/build-utils/src/lambda.ts):

```ts
supportsResponseStreaming?: boolean;
/** @deprecated Use the `supportsResponseStreaming` property instead. */
experimentalResponseStreaming?: boolean;
// ...
this.supportsResponseStreaming = supportsResponseStreaming ?? experimentalResponseStreaming;
```

So write **`supportsResponseStreaming`** in new code; `experimentalResponseStreaming` still works.
Second, it disables streaming when the route is ISR, because a prerender function's response has to
be buffered to be cached.

5. **Runtime string derivation** (`utils.js`):

```js
const valid_node_versions = [20, 22, 24];
const valid_runtimes = ['nodejs20.x', 'nodejs22.x', 'nodejs24.x', 'bun1.x', 'edge'];
function get_default_runtime() {
  const major = Number(process.version.slice(1).split('.')[0]);
  if (!valid_node_versions.includes(major)) throw new Error(/* ... */);
  return `nodejs${major}.x`;
}
```

6. **Skew protection by hand** (see §5.5) and **symlinks inside the `.func`** for shared chunks.

7. **`request.query` transform to strip a reserved param**, showing the 2026 `transforms` feature in
   anger:

```js
{ src: '.*', continue: true,
  transforms: [{ type: 'request.query', op: 'delete', target: { key: '__pathname' } }] }
```

### 7.4 Astro `@astrojs/vercel` — the "directory output" strategy

[github.com/withastro/astro/blob/main/packages/integrations/vercel/src/index.ts](https://github.com/withastro/astro/blob/main/packages/integrations/vercel/src/index.ts)
(the adapter has been consolidated into `src/index.ts`; there is no longer a `src/serverless/adapter.ts`
/ `src/static/adapter.ts` split).

**Headline: Astro uses no `overrides` at all.** A search of `index.ts` for `overrides`, `cleanUrls`,
`getStaticRoutes`, `isStatic` returns zero hits. Its config write is just:

```js
await writeJson(vercelConfigJson, {
  version: 3,
  routes: normalized.routes,
  images,
});
```

It gets extensionless URLs for free by using Astro's `build.format: 'directory'` output — writing
`about/index.html` rather than `about.html` — so plain static file serving resolves `/about` with no
per-page config entry. **This is a genuinely different architecture choice and probably the better
one for a hand-rolled SSG**: emit `blog/modern-irc/index.html` and you need no `overrides` map, no
per-page bookkeeping, and no risk of the `dest`-must-use-the-overridden-path trap in §8.2.

The trade-off: directory output means `/blog/modern-irc` and `/blog/modern-irc/` both naturally
resolve, so you still want an explicit `trailingSlash` policy to avoid duplicate-content indexing.

Astro also **delegates trailing-slash handling to `@vercel/routing-utils`** rather than hand-rolling
regexes:

```js
if (_config.trailingSlash && _config.trailingSlash !== 'ignore') {
  trailingSlash = _config.trailingSlash === 'always';
}
const { routes: redirects = [], error } = getTransformedRoutes({
  trailingSlash,
  rewrites: [],
  redirects: getRedirects(routes, _config),
  headers: [],
});
// ... normalizeRoutes([...(redirects ?? []), ...finalRoutes])
```

Its routes seed is only the asset cache header, with `continue: true`:

```js
const finalRoutes: Route[] = [{
  src: `^/${_config.build.assets}/(.*)$`,
  headers: { 'cache-control': 'public, max-age=31536000, immutable' },
  continue: true,
}];
```

and its 404, matching the Next.js shape:

```js
finalRoutes.push({ src: '/.*', dest: '/404.html', status: 404 });
```

`.vc-config.json` — note it uses the **documented** `supportsResponseStreaming` name and writes no
`memory`/`shouldAddHelpers`:

```js
await writeJson(vcConfig, {
  runtime,
  handler: handler.replaceAll('\\', '/'),
  launcherType: 'Nodejs',
  maxDuration,
  supportsResponseStreaming: true,
});
```

ISR:

```js
await writeJson(prerenderConfig, {
  expiration: isr.expiration ?? false,
  bypassToken: isr.bypassToken,
  allowQuery: [ASTRO_PATH_PARAM, ASTRO_PATH_TOKEN_PARAM],
  passQuery: true,
});
```
— the same trick SvelteKit uses: one catch-all function, cached per-path by smuggling the path
through an allowed query parameter.

### 7.5 Nitro's vercel preset — the cleanest `overrides` implementation

[github.com/nitrojs/nitro/blob/v2/src/presets/vercel/utils.ts](https://github.com/nitrojs/nitro/blob/v2/src/presets/vercel/utils.ts):

```js
overrides: {
  ...Object.fromEntries(
    (nitro._prerenderedRoutes?.filter((r) => r.fileName !== r.route) || [])
      .map(({ route, fileName }) => [
        withoutLeadingSlash(fileName),
        { path: route.replace(/^\//, "") },
      ])
  ),
}
```

Three details worth copying verbatim into a generator:
1. **Only emit an override when `fileName !== route`** — no wasted entries for files already sitting
   at their URL.
2. The **key** is the filename with the leading slash stripped.
3. The **value's `path`** also has the leading slash stripped. Both sides relative.

Its overall config:

```js
const config = defu(nitro.options.vercel?.config, <VercelBuildConfigV3>{
  version: 3,
  framework: { name: nitro.options.framework.name, version: nitro.options.framework.version },
  overrides: { ... },
  routes: [ ... ],
});
```

Routes cover redirect/header rules, skew-protection headers, public asset cache rules, a
`handle: 'filesystem'` marker, ISR rules, observability routes, and a fallback; static-only builds
return early with no ISR config. Note Nitro writes `framework` as `{name, version}` while the docs
type it as `{version: string}` and call it display-only — extra keys appear tolerated.

### 7.6 `vite-plugin-vercel`

[github.com/magne4000/vite-plugin-vercel](https://github.com/magne4000/vite-plugin-vercel) — emits
`.vercel/output` from a Vite build: static under `output/static`, serverless functions bundled from
`/api/*` into `output/functions/api/*.func`, plus edge functions. It auto-generates `config.json` and
exposes a `config` option its README describes as "Advanced configuration to override
`.vercel/output/config.json`", accepting `routes`, `images`, `wildcard`, `cache`, `crons`. ISR is
per-endpoint via an `isr` option taking `expiration` in seconds (production-only, no dev effect).
`outDir` defaults to `.vercel/output`.

*(README-level paraphrase; **UNVERIFIED** whether it uses `overrides` for extensionless HTML.)*

### 7.7 The cross-cutting lesson

The three mature adapters split into exactly **two strategies for extensionless URLs**:

| Strategy | Used by | How |
|---|---|---|
| **Directory output** | Astro | write `about/index.html`; no `config.json` entry needed at all |
| **Overrides map** | SvelteKit, Nitro | write `about.html`; map `"about.html" → { path: "about" }` |

Only SvelteKit additionally emits the paired rewrite/308 routes that normalize the trailing-slash
counterpart — **and that is the piece hand-rolled generators most often forget.**

If you are designing from scratch, **directory output is the lower-risk choice**: it removes an
entire class of bug (the `overrides` map drifting out of sync with the emitted files) and makes every
`dest` in your route table straightforwardly writable.

---

## 8. Gotchas

### 8.1 Route ordering and `handle: filesystem`

- Routes before the first `handle` marker run in the **initial** phase — before the filesystem is
  consulted. Redirects and header-attaching rules belong here.
- `{ "handle": "filesystem" }` marks "check matches after the filesystem misses". Rewrites to
  functions belong after it (that's exactly what the `prerender-functions` and `on-demand-isr`
  examples do).
- Any route with `headers` but no `"continue": true` **terminates routing**. This is the #1 way to
  accidentally serve an empty 200.
- `{ "handle": "error" }` catches 404/500 for custom error pages.
- `check: true` on a Source route "triggers `handle: 'filesystem'` and `handle: 'rewrite'`" — i.e.
  re-enters the filesystem check after a rewrite. Needed if you rewrite to a path that is itself a
  static file.
- Vercel's ordering advice from the vercel.json docs: "Vercel processes routes in the order you
  define them in the array, so wildcard/catch-all patterns should usually be last."
- `important: true` is documented as **deprecated in `vercel.json`** ("A boolean that forces the route
  to take precedence") but the Next.js builder still emits it into `config.json` for its immutable
  `_next/static` header route. Treat it as an undocumented-but-live BOA escape hatch; prefer correct
  ordering + `continue: true` instead.

### 8.2 `overrides` is mandatory for extensionless HTML — including for `Content-Type`

Two separate reasons, both documented:
1. Path: without `overrides`, `/blog/foo` does not resolve to `blog/foo.html` — "neither their
   contents, nor their file name or extension will be modified in any way."
2. Content-Type: if instead you write the file to disk *as* `blog/foo` (no extension), Vercel has no
   extension to infer a MIME type from, and you need `"contentType": "text/html; charset=utf-8"`.
   Vercel's `overrides` example shows exactly this for a JSON file:
   `{ "data": { "contentType": "application/json" } }`.

The cleaner pattern (used by SvelteKit and by Vercel's own example) is: write `foo.html` to disk,
and use `overrides` to *map the URL*. Then the extension still drives the MIME type.

**Third-order gotcha: `overrides` MOVES the URL, it does not add an alias.** Once
`"blog/foo.html": { "path": "blog/foo" }` is in effect, `/blog/foo.html` is no longer served by the
filesystem — which is fine (you emit a 308 for it) but means **every `dest` in your routes that
points at an overridden page must use the overridden path**. Writing `dest: "/404.html"` after
overriding `404.html` → `404` silently produces a routing miss. This bit is not spelled out anywhere
in the docs; it is inferred from the `cleanUrls` design and from Next.js's emitted `dest: "/404"`.

### 8.3 `cleanUrls` does not apply automatically

Covered in §5.3. Restating because it's the single biggest surprise: setting `cleanUrls: true` in
`vercel.json`/`vercel.ts` gets you the *redirects* but not the *resolution* — you still need
`overrides` in `config.json`. And nothing in `config.json` alone gives you either.

**The way out of §8.2 + §8.3 entirely: emit directory output.** Write
`static/blog/modern-irc/index.html` instead of `static/blog/modern-irc.html` and `/blog/modern-irc`
resolves by plain static file serving with no `overrides` at all. This is what Astro's Vercel adapter
does (§7.4) — its `config.json` contains no `overrides` key whatsoever. You still want an explicit
`trailingSlash` policy (both `/blog/modern-irc` and `/blog/modern-irc/` will resolve), but that's one
route pair for the whole site instead of a map entry per page that can drift out of sync with what
you actually wrote to disk.

### 8.4 Framework auto-detection will still pick Next.js if `next` is in `package.json`

Verified in [`packages/frameworks/src/frameworks.ts`](https://github.com/vercel/vercel/blob/main/packages/frameworks/src/frameworks.ts):

```ts
{
  slug: 'nextjs',
  useRuntime: { src: 'package.json', use: '@vercel/next' },
  detectors: { every: [ { matchPackage: 'next' } ] },
  // ...
}
```

`matchPackage: 'next'` — a bare dependency match. So **as long as `next` remains anywhere in
`package.json` dependencies/devDependencies, auto-detection resolves to Next.js and the
`@vercel/next` builder runs instead of `@vercel/static-build`**, and your `.vercel/output` is never
looked at.

Force it off, belt and braces:
1. `"framework": null` in `vercel.json` (or `framework: null` in `vercel.ts`) — "To select 'Other' as
   the Framework Preset, use `null`."
2. Set Framework Preset = **Other** in Project Settings → Build and Deployment.
3. Remove `next` from `package.json` once the migration lands.

### 8.5 Symlinks, `node_modules`, and the function bundle

- Symlinked `.func` directories are explicitly supported: "A `.func` directory may be a symlink to
  another `.func` directory in cases where you want to have more than one path point to the same
  underlying Vercel Function." SvelteKit relies on this and also symlinks *inside* the `.func`.
- Everything the function needs must be **inside** the `.func` directory: "the files below the
  `.func` directory are included (recursively) and files above the `.func` directory are not
  included." A pnpm `node_modules` full of symlinks to a global store will **not** be followed out of
  the `.func` — bundle with esbuild/rollup instead of copying `node_modules`. This is the
  single biggest practical footgun with pnpm specifically.
- SvelteKit writes `{"type": "module"}` as a `package.json` inside each `.func` so its ESM entry
  resolves. Copy that if you emit ESM.
- Bundle limit 250 MB uncompressed; irrelevant for a search-index endpoint unless you inline a big
  index (in which case: put the index in `static/` and `fetch` it, or use Vercel Blob).

### 8.6 `vercel dev` does not work with Build Output API v3

Hard-coded error in `createBuildOutput`:

> `Detected Build Output v3 from "<build command>", but it is not supported for \`vercel dev\`. Please set the Development Command in your Project Settings.`

You must run your own dev server. Set `devCommand` in `vercel.ts`/project settings if you want
`vercel dev` to shell out to it, and note that "If you specify a custom command, your command must
pass your framework's `$PORT` variable."

### 8.7 Node version + package manager in the build container

- Build image: **Amazon Linux 2023** ([/docs/builds/build-image](https://vercel.com/docs/builds/build-image),
  last_updated 2026-08-11). Node `24.x`, `22.x`, `20.x` available. You can `dnf install` extra
  packages via a custom Install Command.
- Node version: project settings dropdown, overridden by `package.json` `engines.node` (`"24.x"`).
- pnpm detection ([/docs/package-managers](https://vercel.com/docs/package-managers), last_updated
  2026-08-11): "If `pnpm-lock.yaml` is present, `pnpm install` is executed". The **version** comes
  from the lockfile's `lockfileVersion`, not from `packageManager`:

  | `lockfileVersion` | pnpm used |
  |---|---|
  | 9.0 | pnpm 9 or 10 ("Newer projects will prefer 10, while older prefer 9") |
  | 7.0 | pnpm 9 |
  | 6.0 / 6.1 | pnpm 8 |
  | 5.3 / 5.4 | pnpm 7 |
  | otherwise | pnpm 6 |

- **Nasty trap:** "When using an override install command like `pnpm install`, Vercel will use the
  **oldest** version of the specified package manager available in the build container. For example,
  if you specify `pnpm install` as your override install command, Vercel will use **pnpm 6**." So do
  *not* set the Install Command override to a bare `pnpm install` — leave it on auto-detect.
- To pin a **specific** pnpm version you need Corepack, which is opt-in: set env var
  `ENABLE_EXPERIMENTAL_COREPACK=1` **and** `"packageManager": "pnpm@x.y.z"` in `package.json`. Then
  "Vercel will use the package manager specified in the `package.json` file's `packageManager` field
  instead." Docs still flag Corepack as experimental.

### 8.8 The prebuilt test loop

```bash
vercel pull                       # get project settings + env vars locally
vercel build                      # runs your buildCommand, produces .vercel/output
ls -R .vercel/output              # inspect before shipping
vercel deploy --prebuilt          # preview URL from the local output
vercel deploy --prebuilt --prod   # production
```

Use `--archive=tgz` if the output has many files (avoids the files-per-deployment limit).

Two caveats:
- `--prebuilt` means "System Environment Variables will be missing at build time" — if your generator
  reads `VERCEL_GIT_COMMIT_SHA` / `VERCEL_URL` / `VERCEL_DEPLOYMENT_ID` at build time (the current
  site reads `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`), a prebuilt deploy will bake in the wrong or empty
  value. Use git-based deploys for production and `--prebuilt` only for testing the output shape.
- Native deps compiled locally (macOS arm64) won't match the Linux x64 runtime. Relevant if you use
  `sharp` or `@resvg/resvg-js` — see §3.

### 8.9 Miscellaneous

- `framework: { version }` in `config.json` is display-only. Harmless to set; nice for the dashboard.
- `crons` only fire on **production** deployments.
- `images.domains` and `images.sizes` are both **required** if you include `images` at all (`domains: []`
  is fine).
- If you ever want `/_vercel/image` to 404 deliberately, just omit `images`: "When the `images`
  property is undefined, visiting the `/_vercel/image` path will respond with 404 Not Found."
- Function name limit: 128 chars including extension, no spaces.
