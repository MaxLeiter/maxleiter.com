import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import type { AssetManifest, PageHead } from './types'

/**
 * The HTML shell. No metadata framework: a typed object and a function.
 *
 * Head tag order follows what Next emits today so the harness diff stays
 * readable. Three deliberate divergences are listed in the report: the title
 * template now applies to posts and notes, the RSS `<link rel="alternate">`
 * appears on every page rather than the homepage only, and `og:image:height`
 * on post pages is 630 rather than the mis-declared 600.
 *
 * The document is assembled as a string rather than one React tree so the body
 * markup lands directly inside `<body>` with no wrapper element.
 */

const SITE_NAME = "Max Leiter's website"
const DEFAULT_TITLE = 'Max Leiter'
const OG_ALT = "Max Leiter's site"

/** The site card, relative to whichever site URL the build context carries. */
const defaultOgImage = (siteUrl: string) => `${siteUrl}/opengraph-image.png`

/**
 * Runs before first paint and corrects the server-rendered `dark` to whatever
 * the visitor actually wants. Replaces next-themes' injected script; there is
 * no hydration to reconcile, which was the only hard part of that component.
 */
export const THEME_SCRIPT =
  `try{var t=localStorage.theme||'system',d=document.documentElement,` +
  `e=t=='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;` +
  `d.dataset.theme=e;d.style.colorScheme=e}catch(_){}`

/**
 * Native instant navigation for browsers that implement Speculation Rules.
 *
 * `moderate` prerenders on hover (~200ms) and on pointer-down, so the click
 * lands on a document that is already rendered -- strictly better than any
 * script-driven swap, because there is no fetch, no parse and no reflow left
 * to do. Browsers that do not understand the script type ignore it, and
 * `runtime.ts` loads the JS router for them instead.
 *
 * `/_assets/*` is excluded because prerendering a stylesheet or a JS chunk is
 * meaningless; only documents are worth speculating on.
 */
const SPECULATION_RULES = JSON.stringify({
  prerender: [
    {
      where: {
        and: [{ href_matches: '/*' }, { not: { href_matches: '/_assets/*' } }],
      },
      eagerness: 'moderate',
    },
  ],
})

/** Cross-document view transitions, with the reduced-motion opt-out. */
export const VIEW_TRANSITION_CSS = `
@view-transition{navigation:auto}
::view-transition-old(root),::view-transition-new(root){animation-duration:180ms}
@media (prefers-reduced-motion:reduce){@view-transition{navigation:none}}
`.trim()

export interface Fonts {
  /** `@font-face` blocks plus the `--font-geist-*` custom properties. */
  css: string
  /** Absolute paths of woff2 files to preload. */
  preload: string[]
}

export interface ShellOptions {
  head: PageHead
  body: string
  /**
   * Split so a same-document navigation can swap only what changed.
   * `base` is identical on every page and the router never touches it;
   * `page` is that route's conditional fragments and is all a swap replaces.
   */
  css: { base: string; page: string }
  fonts: Fonts
  assets: AssetManifest
  /** Island name -> hashed module URL, for the runtime's lazy import. */
  islands: Record<string, string>
  /** `ctx.site.url`; the one place the shell learns the origin. */
  siteUrl: string
  /**
   * The built runtime's source, inlined as a module. Chrome skips the inbound
   * cross-document view transition when the destination has an external
   * `<script type="module" src>` in its head, but runs it for an inline
   * module (bisected 2026-08-31, Chrome 151). It is ~1KB brotli.
   */
  runtime?: string
}

function headTags(head: PageHead, siteUrl: string): ReactElement[] {
  const title = head.title ? `${head.title} | ${DEFAULT_TITLE}` : DEFAULT_TITLE
  // Empty means omit, not fall back. `posts/nintype.mdx` has a blank
  // `description:` and Next drops all three tags rather than substituting the
  // site default; the baseline records that.
  const description = head.description
  const defaultImage = defaultOgImage(siteUrl)
  const ogImage = head.ogImage ?? defaultImage
  const isDefaultImage = ogImage === defaultImage
  const robots = head.noindex ? 'noindex, nofollow' : 'index, follow'

  const tags: ReactElement[] = [
    <meta charSet="utf-8" key="charset" />,
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1"
      key="viewport"
    />,
    <meta name="theme-color" content="#000000" key="theme-color" />,
    <title key="title">{title}</title>,
    ...(description
      ? [<meta name="description" content={description} key="description" />]
      : []),
    <meta name="robots" content={robots} key="robots" />,
    <meta name="googlebot" content={robots} key="googlebot" />,
    <link rel="canonical" href={head.canonical} key="canonical" />,
    <link
      rel="alternate"
      type="application/rss+xml"
      href={`${siteUrl}/feed.xml`}
      key="rss"
    />,
    <meta property="og:title" content={DEFAULT_TITLE} key="og:title" />,
    ...(description
      ? [
          <meta
            property="og:description"
            content={description}
            key="og:description"
          />,
        ]
      : []),
    <meta property="og:url" content={siteUrl} key="og:url" />,
    <meta property="og:site_name" content={SITE_NAME} key="og:site_name" />,
    <meta property="og:locale" content="en_US" key="og:locale" />,
    <meta property="og:image" content={ogImage} key="og:image" />,
    <meta property="og:image:type" content="image/png" key="og:image:type" />,
    <meta property="og:image:width" content="1200" key="og:image:width" />,
    <meta property="og:image:height" content="630" key="og:image:height" />,
  ]

  if (isDefaultImage) {
    tags.push(
      <meta property="og:image:alt" content={OG_ALT} key="og:image:alt" />,
    )
  }

  tags.push(
    <meta
      property="og:type"
      content={head.ogType ?? 'website'}
      key="og:type"
    />,
  )

  if (head.publishedTime) {
    tags.push(
      <meta
        property="article:published_time"
        content={head.publishedTime}
        key="published"
      />,
    )
  }

  tags.push(
    <meta
      name="twitter:card"
      content="summary_large_image"
      key="twitter:card"
    />,
    <meta name="twitter:creator" content="@maxleiter" key="twitter:creator" />,
    <meta name="twitter:title" content={DEFAULT_TITLE} key="twitter:title" />,
    ...(description
      ? [
          <meta
            name="twitter:description"
            content={description}
            key="twitter:description"
          />,
        ]
      : []),
    <meta name="twitter:image" content={ogImage} key="twitter:image" />,
  )

  if (isDefaultImage) {
    tags.push(
      <meta
        name="twitter:image:alt"
        content={OG_ALT}
        key="twitter:image:alt"
      />,
    )
  }

  tags.push(
    <meta name="twitter:image:width" content="1200" key="twitter:image:w" />,
    <meta name="twitter:image:height" content="630" key="twitter:image:h" />,
    <link
      rel="shortcut icon"
      href={`${siteUrl}/favicons/favicon.ico`}
      key="shortcut"
    />,
    <link
      rel="icon"
      href="/favicon.ico"
      sizes="48x48"
      type="image/x-icon"
      key="icon"
    />,
  )

  return tags
}

function preloadTags(hrefs: string[]): ReactElement[] {
  return hrefs.map((href) => (
    <link
      key={href}
      rel="preload"
      href={href}
      as="font"
      type="font/woff2"
      crossOrigin=""
    />
  ))
}

function islandsScript(islands: Record<string, string>): string {
  if (Object.keys(islands).length === 0) return ''
  return `<script type="application/json" id="__islands">${JSON.stringify(
    islands,
  )}</script>`
}

export function renderShell(options: ShellOptions): string {
  const { head, body, css, fonts, assets, islands, siteUrl } = options

  const headHtml = [
    renderToStaticMarkup(<>{headTags(head, siteUrl)}</>),
    renderToStaticMarkup(<>{preloadTags(fonts.preload)}</>),
    // Two tags, not one. The base sheet, the fonts and the view-transition
    // rules are byte-identical on every page, so a same-document navigation
    // leaves `#css-base` alone and swaps only `#css-page`.
    `<style id="css-base">${fonts.css}\n${css.base}\n${VIEW_TRANSITION_CSS}</style>`,
    `<style id="css-page">${css.page}</style>`,
    `<script>${THEME_SCRIPT}</script>`,
  ].join('')

  const scripts: string[] = [
    islandsScript(islands),
    `<script type="speculationrules">${SPECULATION_RULES}</script>`,
  ]
  if (options.runtime) {
    const inline = options.runtime.replace(/<\/script/gi, '<\\/script')
    scripts.push(`<script type="module">${inline}</script>`)
  } else if (assets['runtime.js']) {
    scripts.push(
      `<script type="module" src="${assets['runtime.js']}"></script>`,
    )
  }
  scripts.push('<script defer src="/_vercel/insights/script.js"></script>')

  return (
    '<!doctype html>' +
    '<html lang="en" data-theme="dark" style="color-scheme:dark">' +
    `<head>${headHtml}</head>` +
    `<body>${body}${scripts.join('')}</body>` +
    '</html>'
  )
}

/**
 * The same page with everything a soft navigation already has removed: no
 * fonts, no base sheet, no runtime, no analytics tag, no theme script.
 *
 * The router fetches this instead of the full document, so a navigation
 * transfers the body and that route's CSS fragments rather than re-sending the
 * ~30KB of shell every page repeats. It is still a parseable HTML document, so
 * `DOMParser` sorts the head tags from the body markup with no bespoke format
 * to keep in sync -- and the head is rendered by the very same `headTags`, so
 * the two can never disagree about a canonical or an og: tag.
 */
export function renderPartial(options: ShellOptions): string {
  const { head, body, css, islands, siteUrl } = options
  const headHtml = renderToStaticMarkup(<>{headTags(head, siteUrl)}</>)
  return (
    `<!doctype html><html><head>${headHtml}` +
    `<style id="css-page">${css.page}</style></head>` +
    `<body>${body}${islandsScript(islands)}</body></html>`
  )
}

/** Renders a page component to markup, without the shell. */
export function renderBody(element: ReactElement): string {
  return renderToStaticMarkup(element)
}
