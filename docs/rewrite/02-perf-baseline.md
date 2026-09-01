# maxleiter.com — Next.js performance baseline

Measured 2026-08-30. Next 16.4.0-canary.12 (Turbopack), React 19.2.8, App Router,
`experimental.inlineCss: true`, `reactCompiler: true`.

---

## 0. Measurement caveats (read first)

These materially affect how to read section A.

1. **`pnpm build-next` fails on the current tree.** Four `TS2559` errors in the
   *generated* file `.next/dev/types/validator.ts`, for `opengraph-image`,
   `blog/[slug]/opengraph-image`, `robots` and `sitemap`. This is a canary
   type-generation bug, not app code. Every build below required temporarily
   setting `typescript: { ignoreBuildErrors: true }` in `next.config.mjs`.
   The file was restored byte-exact after each build
   (sha1 `8a82977bfcb2a7e9612d1916d1df048e60723578`, verified).
2. **Outbound network is blocked for Node processes in this sandbox** (curl works,
   Node does not). Build-time fetches to `cdn.syndication.twimg.com` and GitHub
   fail or hang. This inflates the *cold* build by ~16 minutes. See A.
3. **`next dev` was running in the repo throughout**, sharing `.next/` and
   competing for CPU.
4. **No `GITHUB_TOKEN`** in `.env.local`. The build logs
   `No GITHUB_TOKEN provided; skipping GitHub star counts.` and succeeds.
5. `pnpm` on PATH (`/opt/homebrew/bin/pnpm`) is a broken corepack shim
   (signature verification error). Used `/Users/max/Library/pnpm/pnpm` (9.14.2).
6. `posts/modern-irc.mdx` and `notes/mac-setup.mdx` are new/untracked and were not
   in the prerender set, so `/blog/modern-irc` and `/notes/mac-setup` 404.
   Used `/blog/weights` and `/notes/fish-directory-colors` instead.

---

## A. Build time

### Cold (`rm -rf .next`, network blocked)

| phase | time |
|---|---|
| Turbopack compile | 3.6 s (a second cold run: 5.8 s) |
| TypeScript config validation | 163 ms |
| Static generation, 46 pages, 15 workers | **16.5 min** |
| exit code | 0 |

The 16.5 min is **entirely a sandbox artifact**. 16 of 46 pages hit Next's 60 s
per-page build timeout on attempt 1 and were retried, including `/_not-found`
and `/_global-error`, which fetch nothing — all 15 workers were blocked on hanging
sockets, so unrelated pages queued past their deadline.

### Warm (`.next` present)

Three runs:

| run | compile | static generation | wall clock |
|---|---|---|---|
| 1 | 520 ms | 1,040 ms | not timed |
| 2 | 286 ms | 975 ms | **2.36 s** (user 7.15 s, sys 4.13 s) |

A warm full build is **2.4 seconds**. That is the honest figure for the real work;
the cold number is dominated by blocked DNS.

### Type check, standalone

`node_modules/.bin/tsc --noEmit` — TypeScript 7.0.2 (native port): **0.15 s real**,
and it reports the 4 errors above.

### RSS

`node scripts/rss.mts` (needs Node ≥22 for native TS; ran on 25.9.0):
**0.12 s / 0.09 s / 0.08 s**. No network. Writes `public/feed.xml` (gitignored),
252,534 bytes.

### Route table

46 prerendered entries. Everything is static or SSG except one dynamic route.

```
┌ ○ /                                    ├ ○ /blog/[slug]/opengraph-image-3lcqvo
├ ○ /_not-found                          ├ ○ /labs
├ ○ /about                               ├ ○ /notes
├ ƒ /api/knightos-package/[...path]      ├   /notes/[slug]  ● 8 paths
├ ○ /api/search-index                    ├ ○ /opengraph-image
├ ○ /blog                                ├ ○ /projects
├   /blog/[slug]  ● 24 paths             ├ ○ /robots.txt
                                         ├ ○ /sitemap.xml
                                         └ ○ /talks
○ Static   ● SSG   ƒ Dynamic
```

**Next 16.4 no longer prints a "First Load JS" column.** Sizes below are measured
by hand.

---

## B. Output size

### Totals

| dir | size |
|---|---|
| `.next` | 220 M |
| `.next/server` | 55 M |
| `.next/static` | **1.0 M** |
| `.next/static/chunks` | 904 K |
| `.next/static/media` | 136 K |
| `.next/static/<buildid>` | 12 K |

| kind | files | raw | gzip -9 | brotli q11 |
|---|---|---|---|---|
| JS | 25 | 806,373 | 263,304 | 228,822 |
| CSS | 6 | 51,718 | 12,701 | 10,938 |

`media/` is 2 woff2 fonts (58,512 + 58,092) and a 15,406 B favicon.
`brotli` CLI is not installed; all brotli figures use Node `zlib` at quality 11.

### All 25 JS chunks (raw / gzip / brotli), with identification

| # | raw | gzip | brotli | file | what it is |
|---|---|---|---|---|---|
| 1 | 229,517 | 71,552 | 61,368 | `2nckoqqunqhf1.js` | **react-dom client runtime** |
| 2 | 156,232 | 42,654 | 36,243 | `203zi8tl808_6.js` | **Next app-router + React Flight client** |
| 3 | 112,594 | 39,520 | 35,158 | `0cz1d0mv5g_q7.js` | **core-js polyfills — `noModule`, see below** |
| 4 | 47,955 | 17,049 | 15,346 | `2ydidsbyfbzfz.js` | react-diff-viewer (lazy) |
| 5 | 44,806 | 14,857 | 12,567 | `0r07fpu778jj9.js` | desktop window system (Snap/Resize/Fullscreen) |
| 6 | 31,201 | 8,443 | 7,463 | `3nvuk-v5vchcw.js` | React + `next/image` helpers |
| 7 | 26,687 | 9,864 | 8,721 | `3_m188-iq6-g6.js` | WindowToolbar, FileTree, ShotGrid |
| 8 | 17,474 | 6,904 | 6,046 | `2_sb4mww__8dr.js` | BlogListContent + WindowToolbar |
| 9 | 16,471 | 6,585 | 5,764 | `1gjcoych6yd76.js` | BlogListContent / NotesContent |
| 10 | 16,421 | 6,544 | 5,730 | `3hi74dxce0ti9.js` | app route chunk |
| 11 | 13,938 | 3,508 | 3,141 | `113gn1tkvrmqj.js` | Next ClientPageRoot / ClientSegmentRoot / BFCache |
| 12 | 13,428 | 5,132 | 4,510 | `441a4yeb62t1u.js` | next-themes + Vercel Analytics |
| 13 | 13,095 | 3,667 | 3,164 | `1fo_i3zi4doqe.js` | next-themes |
| 14 | 11,576 | 4,735 | 4,153 | `2utz3688x6-kq.js` | app route chunk |
| 15 | 10,664 | 4,186 | 3,750 | `turbopack-0ih25bh_dxmok.js` | Turbopack module runtime |
| 16 | 8,434 | 2,401 | 2,083 | `3i6cu6wi8qgn1.js` | app |
| 17 | 8,377 | 3,562 | 3,119 | `10vp1z8t-i_hr.js` | BlogPostPageClient |
| 18 | 8,376 | 3,564 | 3,130 | `2pmmunaq2wg40.js` | NotePageClient |
| 19 | 6,610 | 2,764 | 2,380 | `3zqsic2m0dl7m.js` | app |
| 20 | 4,943 | 2,080 | 1,809 | `09_7hepwuhe3x.js` | app |
| 21 | 3,897 | 1,810 | 1,555 | `3v4meqp1czhwl.js` | app |
| 22 | 3,179 | 1,583 | 1,317 | `08-s6iic45rwz.js` | error boundary ("Something went wrong") |
| 23–25 | 498 | 340 | 305 | `_buildManifest` / `_ssgManifest` / `_clientMiddlewareManifest` | |

### The 112 KB polyfill chunk is `noModule`

`<script src="/_next/static/chunks/0cz1d0mv5g_q7.js" noModule="">` — core-js.
No ES-module-capable browser downloads it. **Excluded from all "modern browser"
figures below.** It is present identically on the live site. (Next renders the
attribute as `noModule=""`; HTML attribute names are case-insensitive, so it
works correctly.)

### What a fresh visitor downloads (local production server)

Modern browser, excluding the `noModule` chunk:

| page | JS files (total/modern) | JS raw | JS gzip | JS brotli |
|---|---|---|---|---|
| `/` | 11 / 10 | 532,531 | 162,167 | 139,287 |
| `/blog` | 10 / 9 | 488,728 | 147,629 | 127,002 |
| `/blog/weights` | 11 / 10 | 506,318 | 154,151 | 132,796 |
| `/notes/fish-directory-colors` | 11 / 10 | 506,317 | 154,153 | 132,807 |

Plus **116,604 B of woff2 fonts** (2 files, both `rel=preload`) on every page.
Zero external stylesheets — all CSS is inlined (`experimental.inlineCss`).

### HTML composition

| page | HTML raw | gzip | brotli | `<script>` tags | external src | non-flight inline JS |
|---|---|---|---|---|---|---|
| `/` | 160,510 | 36,187 | 19,726 | 20 | 11 | 1,101 |
| `/blog` | 163,317 | 31,031 | 14,125 | 17 | 10 | 896 |
| `/blog/weights` | 157,607 | 35,078 | 15,942 | 22 | 11 | 1,128 |
| `/notes/fish-…` | 245,717 | 38,554 | 18,401 | 22 | 11 | 1,128 |

Raw byte split, and the **marginal** brotli cost of each part (measured by
removing it and recompressing — this is the honest number, since compressing the
parts separately double-counts shared text):

| page | flight raw | % of HTML | inline CSS raw | markup raw | flight marginal br | inline CSS marginal br | markup br |
|---|---|---|---|---|---|---|---|
| `/` | 98,592 | 61.4% | 30,728 | 29,045 | **9,022** | 6,142 | 4,562 |
| `/blog` | 83,368 | 51.0% | 30,728 | 47,379 | **3,614** | 6,180 | 4,331 |
| `/blog/weights` | 98,611 | 62.6% | 47,963 | 8,718 | **3,697** | 9,092 | 3,153 |
| `/notes/fish-…` | 159,471 | 64.9% | 48,763 | 35,108 | **5,472** | 9,132 | 3,797 |

Post prose *is* server-rendered into the markup (verified by reading the text out
of the raw HTML). On `/blog/weights` the flight payload is **11.3× the size of the
markup it duplicates** in raw bytes, but only **3,697 B brotli** at the margin,
because brotli deduplicates against the markup.

---

## C. Server response (local `next start -p 3456`)

Median of 10 requests each. Server compresses (gzip) when asked.

| page | median TTFB | median total | size |
|---|---|---|---|
| `/` | **1.3 ms** | 1.4 ms | 160,510 |
| `/blog` | **1.1 ms** | 1.2 ms | 163,317 |
| `/blog/weights` | **1.1 ms** | 1.2 ms | 157,607 |
| `/notes/fish-directory-colors` | **1.3 ms** | 1.3 ms | 245,717 |

### API routes and metadata

| route | status | type | size | cache | TTFB |
|---|---|---|---|---|---|
| `/api/search-index` | 200 | application/json | 5,671 | **static**, `x-nextjs-cache: HIT`, `s-maxage=31536000` | 9.1 ms cold |
| `/api/knightos-package/[...path]` | 500 | text/plain | 22 | **dynamic (ƒ)**, proxies `packages.knightos.org` | 213 ms |
| `/feed.xml` | 200 | application/xml | 262,963 | static file in `public/`, `max-age=0`, ETag | 1.3 ms |
| `/sitemap.xml` | 200 | application/xml | 3,493 | prerendered, `max-age=0, must-revalidate` | 2.6 ms |
| `/robots.txt` | 200 | text/plain | 95 | prerendered | 2.3 ms |
| `/opengraph-image` | 200 | image/png | 37,941 | **prerendered at build** | 1.9 ms |

The knightos route 500s only because the sandbox blocks its outbound fetch. On
success it sets `Cache-Control: public, max-age=31536000, immutable`.

### OG images

Root OG is prerendered. **Per-post OG images are not** — the route table lists
`○ /blog/[slug]/opengraph-image-3lcqvo` (Static, no `generateStaticParams`), so
each slug is rendered on first request and cached after.

| slug | first hit | size | subsequent |
|---|---|---|---|
| weights | **436 ms** | 36,933 | 1.5–2.6 ms (`x-nextjs-cache: HIT`) |
| xios | 221 ms | 48,492 | |
| sandcastle | 188 ms | 45,751 | |
| framework | 207 ms | 39,117 | |

---

## D. Live site (https://maxleiter.com)

Vercel, HTTP/2, `sfo1`. `server: Vercel`, no `x-powered-by`.
Same Next 16.4.0-canary.12, but a **different (older) build** — chunk hashes and
code splitting differ from the local build.

### Headers

All four pages: `x-nextjs-prerender: 1`, `x-nextjs-stale-time: 300`,
`cache-control: public, max-age=0, must-revalidate`,
`x-vercel-cache: HIT` or `PRERENDER`. Ages observed 0–2,745 s.

Static assets: `/_next/static/immutable/…`,
`cache-control: public,max-age=31536000,immutable`, `content-encoding: br`.

### TTFB, 5 samples each (ms)

| page | samples | median |
|---|---|---|
| `/` | 79, 84, 97, 73, 85 | **84** |
| `/blog` | 69, 68, 81, 73, 73 | **73** |
| `/blog/weights` | 81, 75, 83, 76, 71 | **76** |
| `/notes/fish-directory-colors` | 85, 73, 70, 70, 75 | **73** |

RTT-dominated, not compute.

### True on-the-wire bytes (brotli, as actually served)

| page | HTML raw | HTML wire | JS files | all JS+HTML wire | **modern (excl. noModule)** |
|---|---|---|---|---|---|
| `/` | 176,770 | 24,840 | 11 | 234,081 | **192,738** |
| `/blog` | 179,105 | 19,323 | 11 | 229,377 | **188,034** |
| `/blog/weights` | 179,104 | 25,270 | 12 | 247,447 | **206,104** |
| `/notes/fish-…` | 267,261 | 29,080 | 12 | 251,264 | **209,921** |

Plus 117,204 B of fonts.

### Vercel's brotli is low quality

For the react-dom chunk (`31mzcns92646d.js`, 229,978 raw):

| encoding | bytes |
|---|---|
| Vercel `br` (as served) | 73,291 |
| Vercel `gzip` (as served) | 72,595 |
| local brotli q11 | **61,552** |
| local gzip -9 | 71,781 |

Vercel is compressing on the fly at a low brotli level — **its brotli is worse
than its own gzip, and 19% worse than max brotli.** Real transfer is ~gzip-grade.

### Third parties

**None referenced in the initial HTML.** Fonts are self-hosted and preloaded.
Vercel Analytics (`@vercel/analytics/react`, `app/layout.tsx:79`) is bundled and
injects `/_vercel/insights/script.js` after hydration. Matomo env vars exist in
`.env.local` but no Matomo script appears in the HTML.

---

## E. Lighthouse 12.8.2, headless Chrome, local production server

| run | score | FCP | LCP | TBT | CLS | Speed Index | total bytes | main thread | JS exec |
|---|---|---|---|---|---|---|---|---|---|
| `/` desktop | **99** | 212 ms | 892 ms | 0 ms | 0.0001 | 263 ms | 1,280,824 | 85 ms | 0 ms |
| `/` mobile | **92** | 780 ms | 3,303 ms | 3 ms | 0.0005 | 780 ms | 1,199,880 | 303 ms | 110 ms |
| `/blog/weights` desktop | **100** | 216 ms | 576 ms | 0 ms | 0 | 216 ms | 405,684 | 73 ms | 0 ms |
| `/blog/weights` mobile | **95** | 790 ms | 2,907 ms | 2 ms | 0 | 790 ms | 405,684 | 257 ms | 107 ms |

"Reduce unused JavaScript": **40 / 450 / 10 / 200 bytes.** Effectively zero — the
code splitting is already tight. "Legacy JavaScript": 0–300 B (the `noModule`
chunk is correctly skipped).

Main-thread breakdown, homepage mobile: scriptEvaluation 148 ms,
other 81, scriptParseCompile 39, styleLayout 16, GC 8, parseHTML 6, paint 5.
The single most expensive script is react-dom at 105 ms.

### Request breakdown, homepage desktop (42 requests, 1,277,773 B)

| type | count | transfer |
|---|---|---|
| **image** | 1 | **754,541** |
| script | 17 | 204,376 |
| other (RSC prefetch) | 21 | 164,891 |
| font | 2 | 117,204 |
| document | 1 | 36,761 |
| stylesheet | 0 | 0 |

The image is a single third-party PNG,
`https://tddeuevmbjbaaeoi.public.blob.vercel-storage.com/blog/xios/ladybird.png`,
**754,541 B**, served straight from Blob storage without going through image
optimization. It is 59% of the page weight and larger than all JS combined.

### RSC prefetch traffic

Next prefetches the flight payload for every link in view.

| page | prefetch requests | bytes |
|---|---|---|
| `/` | 21 | **164,891** |
| `/blog/weights` | 7 | **61,420** |

Individual prefetches run 659 B to 28,822 B.

---

## F. Dependency footprint

| item | value |
|---|---|
| `node_modules` | **541 M** |
| packages in `pnpm-lock.yaml` (v9.0) | **538** |
| dirs in `node_modules/.pnpm` | 750 |
| top-level entries | 44 |
| `next` (resolved) | **200 M** |
| `react-dom` | 7.1 M |
| `react` | 252 K |

Largest single items: `next` 200 M, `@next/swc-darwin-arm64` 86 M,
`@typescript/typescript-darwin-arm64` 26 M, `@img/sharp-libvips` 17 M,
`@oxlint/binding` 12 M, `tm-grammars` 11 M, `rxjs` 11 M, `highlight.js` 9.1 M,
`@code-hike/lighter` 9.0 M.

Install timing skipped.

---

## G. Interpretation

### Framework vs. this site's own code

Shared on every page (brotli q11):

| chunk | raw | brotli |
|---|---|---|
| react-dom client runtime | 229,517 | 61,368 |
| Next app-router + Flight client | 156,232 | 36,243 |
| React + next/image helpers | 31,201 | 7,463 |
| Next client roots / BFCache | 13,938 | 3,141 |
| Turbopack module runtime | 10,664 | 3,750 |
| **framework subtotal** | **441,552** | **111,965** |

| page | framework br | app + libs br | total br | **framework share** |
|---|---|---|---|---|
| `/` | 111,965 | 27,322 | 139,287 | **80.4%** |
| `/blog/weights` | 111,965 | 20,831 | 132,796 | **84.3%** |

The site's own code is small: the entire draggable-window desktop system is
12,567 B brotli, the blog/notes list is 5,764 B, the post shell is 3,119 B.
next-themes and Vercel Analytics together add ~7,674 B.

### How much HTML is RSC duplication

In raw bytes the flight payload is 51–65% of every document, and on a blog post it
is 11.3× the markup it duplicates. **After compression it costs 3.6–9.0 KB.**
Brotli sees that the flight is a re-encoding of text already in the markup. The
"RSC doubles your HTML" worry is real on the disk and largely imaginary on the wire.

### Theoretical floor for a blog post

Plain HTML with inlined CSS and no JS, compressed as one document:

| component | brotli |
|---|---|
| markup (incl. the window chrome) | 3,153 |
| inlined CSS (Tailwind + syntax highlighting) | 9,092 |
| **document, compressed together** | **12,245** |
| fonts (unchanged unless subset) | 116,604 |
| JS | 0 |
| **floor total** | **~129 KB** |

Against today's local build: 15,942 (HTML) + 132,796 (JS) + 116,604 (fonts)
= **265,342 B**, plus ~61 KB of RSC prefetch.

**A hand-rolled static build saves roughly 130–190 KB per blog post, about
50–60% of transferred bytes — and essentially all of it is React runtime,
Next runtime, and prefetch traffic.**

### Realistic floor for the homepage

The homepage is a genuinely interactive React app: draggable and resizable
windows with snap zones, a command palette, theme switching. You cannot delete
React there without rewriting it. The app code itself is 27 KB brotli, so a
vanilla or Preact-class implementation would land somewhere near **30–40 KB
brotli against 139 KB today**. That is a real win but a large rewrite of the
most intricate code in the repo.

### Where Next.js is already at the floor — be honest

- **Serving.** 1.1–1.3 ms local TTFB; live is CDN-cached static HTML at 73–84 ms,
  which is round-trip time. There is nothing to win.
- **Build time.** 2.4 s warm for 46 pages. Nothing to win.
- **HTML size.** 12.2–15.9 KB brotli per document. Near the floor.
- **Code splitting.** Lighthouse finds 10–450 *bytes* of unused JS. Next is
  already splitting essentially perfectly.
- **Runtime cost.** TBT 0–3 ms, CLS ~0, scores 92–100. No user-visible jank.

### Where the actual wins are, largest first

1. **The 754 KB `ladybird.png`** on the homepage, served raw from Blob storage.
   Bigger than all JS combined and entirely framework-independent. Route it
   through image optimization or pre-encode it to AVIF/WebP.
2. **~133 KB brotli of React + Next runtime** on pages that are pure prose.
   This is the only axis where a bespoke framework structurally wins.
3. **61–165 KB of RSC link prefetch** per page. A static site has none of this.
4. **117 KB of fonts** on every page. Framework-independent; subsetting would help.
5. **Vercel's low-quality brotli.** Precompressing assets at brotli q11 would cut
   ~16% off JS transfer with zero code change and no framework change.

Items 1, 4 and 5 are worth more than item 2 on the homepage and cost nothing
architecturally. Item 2 only pays off on the prose pages, where the current
Lighthouse score is already 95–100.

---

## Artifacts

All in `/private/tmp/claude-501/-Users-max-Documents-maxleiter-com/bf88a672-4af6-4500-9dcc-0b3a3e3091ec/scratchpad/`:

- `build-cold.log`, `build-warm.log` — build output
- `lh-home-desktop.json`, `lh-home-mobile.json`, `lh-post-desktop.json`, `lh-post-mobile.json`
- `pageanalyze.mjs`, `wire.sh` — measurement scripts
- `pageanalyze.txt`, `pageanalyze2.txt`, `live-analyze.txt` — per-page output
- `page_*.html` — captured HTML
- `next.config.mjs.ORIG` — config backup (original restored and verified)

State left behind: `.next` rebuilt and in place. `next.config.mjs` restored
byte-exact. Local server on port 3456 stopped (the user's `next dev` untouched).
`public/feed.xml` regenerated — gitignored, and the build regenerates it anyway.
No tracked file was left modified.
