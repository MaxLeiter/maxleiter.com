import NextHead from 'next/head'
import { useRouter } from 'next/router'
type Props = {
  title?: string
  description?: string
  image?: string
  children?: React.ReactNode | React.ReactNode[]
}

const Head = ({
  title = 'Max Leiter',
  description = 'My blog and miscellaneous pages',
  image = '',
  children,
}: Props) => {
  const router = useRouter()
  const url = `https://maxleiter.com${router.asPath}`
  return (
    <NextHead>
      {/* Title */}
      <title>{title}</title>
      <meta name="og:title" content={title} />

      {/* Description */}
      <meta name="description" content={description} />
      <meta name="og:description" content={description} />

      {/* Image */}
      <meta name="twitter:image" content={image} />
      <meta name="og:image" content={image} />

      {/* URL */}
      <meta name="og:url" content={url} />

      {/* General */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Language" content="en" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@max_leiter" />
      <meta property="og:site_name" content="Max Leiter's site" />
      <meta name="apple-mobile-web-app-title" content="Max" />
      <meta name="author" content="Max Leiter" />
      <meta property="og:type" content="website" />
      <meta charSet="utf-8" />
      <meta property="og:locale" content="en" />

      {/* RSS feed */}
      <link
        rel="alternate"
        type="application/rss+xml"
        title="RSS Feed for maxleiter.com"
        href="/feed.xml"
      />

      {/* Favicons */}
      <link rel="manifest" href="/favicons/manifest.json" />
      <meta name="theme-color" content="#000000" />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/favicons/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/svg+xml"
        href="/favicons/favicon-32x32.png"
        key="dynamic-favicon"
      />

      {children}
    </NextHead>
  )
}

export default Head
