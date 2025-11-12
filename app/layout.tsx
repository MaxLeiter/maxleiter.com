import '@styles/global.css'
import '@styles/desktop.css'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/react'
import { ThemeProvider } from 'next-themes'
import { Viewport } from 'next'
import { getBlogPosts, getProjectsData } from '@lib/portfolio-data'
import { GlobalKeyboardHandler } from '@components/desktop/global-keyboard-handler'
import { EffectsProvider } from '@components/desktop/effects-context'

export const dynamic = 'force-static'

export const metadata = {
  metadataBase: new URL('https://maxleiter.com'),
  title: {
    template: '%s | Max Leiter',
    default: 'Max Leiter',
  },
  description: 'A website by Max Leiter.',
  openGraph: {
    title: 'Max Leiter',
    url: 'https://maxleiter.com',
    siteName: "Max Leiter's website",
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: `https://maxleiter.com/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "Max Leiter's site",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  twitter: {
    title: 'Max Leiter',
    card: 'summary_large_image',
    creator: '@max_leiter',
  },
  icons: {
    shortcut: 'https://maxleiter.com/favicons/favicon.ico',
  },
  alternates: {
    types: {
      'application/rss+xml': 'https://maxleiter.com/feed.xml',
    },
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [blogPosts, projects] = await Promise.all([
    getBlogPosts(),
    getProjectsData(),
  ])

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <ThemeProvider>
          <EffectsProvider>
            {children}
            <GlobalKeyboardHandler blogPosts={blogPosts} projects={projects} />
            <Analytics />
          </EffectsProvider>
        </ThemeProvider>
        {/* {process.env.NODE_ENV === 'development' ? <VercelToolbar /> : null} */}
      </body>
    </html>
  )
}
