import styles from './layout.module.css'
import '@styles/global.css'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className={styles.wrapper}>
          <main className={styles.main}>{children}</main>
          <div className={styles.fade} />
        </div>
        <Analytics />
      </body>
    </html>
  )
}

export const config = { runtime: 'edge' }
export const metadata = {
  title: {
    template: '%s | Max Leiter',
    default: 'Max Leiter',
  },
  description: 'Full-stack developer',
  keywords:
    'max leiter, full-stack developer, web developer, next.js, supabase',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f5' },
    { media: '(prefers-color-scheme: dark)', color: '#000' },
  ],
  openGraph: {
    title: 'Max Leiter',
    description: 'Full-stack developer',
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

export const runtime = 'edge'
