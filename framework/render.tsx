import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import type { AssetManifest, BuildContext, Head } from './types'

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

const SITE_URL = 'https://maxleiter.com'
const SITE_NAME = "Max Leiter's website"
const DEFAULT_TITLE = 'Max Leiter'
const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph-image.png`
const OG_ALT = "Max Leiter's site"

/**
 * Runs before first paint and corrects the server-rendered `dark` to whatever
 * the visitor actually wants. Replaces next-themes' injected script; there is
 * no hydration to reconcile, which was the only hard part of that component.
 */
export const THEME_SCRIPT =
  `try{var t=localStorage.theme||'system',d=document.documentElement,` +
  `e=t=='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;` +
  `d.dataset.theme=e;d.style.colorScheme=e}catch(_){}`

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
  head: Head
  body: string
  css: string
  fonts: Fonts
  assets: AssetManifest
  /** Island name -> hashed module URL, for the runtime's lazy import. */
  islands: Record<string, string>
  /** Appended verbatim before `</body>`. Used by the dev server. */
  extraBodyHtml?: string
}

function headTags(head: Head): ReactElement[] {
  const title = !head.title
    ? DEFAULT_TITLE
    : head.titleSuffix === false
      ? head.title
      : `${head.title} | ${DEFAULT_TITLE}`
  // Empty means omit, not fall back. `posts/nintype.mdx` has a blank
  // `description:` and Next drops all three tags rather than substituting the
  // site default; the baseline records that.
  const description = head.description
  const ogImage = head.ogImage ?? DEFAULT_OG_IMAGE
  const isDefaultImage = ogImage === DEFAULT_OG_IMAGE
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
      href={`${SITE_URL}/feed.xml`}
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
    <meta property="og:url" content={SITE_URL} key="og:url" />,
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
      href={`${SITE_URL}/favicons/favicon.ico`}
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

export function renderShell(options: ShellOptions): string {
  const { head, body, css, fonts, assets, islands, extraBodyHtml } = options

  const headHtml = [
    renderToStaticMarkup(<>{headTags(head)}</>),
    renderToStaticMarkup(<>{preloadTags(fonts.preload)}</>),
    `<style>${fonts.css}\n${css}\n${VIEW_TRANSITION_CSS}</style>`,
    `<script>${THEME_SCRIPT}</script>`,
  ].join('')

  const scripts: string[] = []
  if (Object.keys(islands).length > 0) {
    scripts.push(
      `<script type="application/json" id="__islands">${JSON.stringify(
        islands,
      )}</script>`,
    )
  }
  const runtime = assets['runtime.js']
  if (runtime) scripts.push(`<script type="module" src="${runtime}"></script>`)
  scripts.push('<script defer src="/_vercel/insights/script.js"></script>')
  if (extraBodyHtml) scripts.push(extraBodyHtml)

  return (
    '<!doctype html>' +
    '<html lang="en" data-theme="dark" style="color-scheme:dark">' +
    `<head>${headHtml}</head>` +
    `<body>${body}${scripts.join('')}</body>` +
    '</html>'
  )
}

/** Renders a page component to markup, without the shell. */
export function renderBody(element: ReactElement): string {
  return renderToStaticMarkup(element)
}

/** Absolute URL for a route path. */
export function absoluteUrl(ctx: BuildContext, routePath: string): string {
  return routePath === '/' ? ctx.site.url : `${ctx.site.url}${routePath}`
}
