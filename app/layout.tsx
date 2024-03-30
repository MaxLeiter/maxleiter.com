import styles from './layout.module.css'
import '@styles/global.css'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { ThemeProvider } from 'next-themes'
import { Viewport } from 'next'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className={styles.wrapper}>
            <main className={styles.main}>{children}</main>
          </div>
          <Analytics />
        </ThemeProvider>
        {/* {process.env.NODE_ENV === 'development' ? <VercelToolbar /> : null} */}
      </body>
    </html>
  )
}

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
        url: `https://maxleiter.com/api/og?title=${encodeURIComponent(
          "Max Leiter's site"
        )}`,
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f5' },
    { media: '(prefers-color-scheme: dark)', color: '#000' },
  ],
}