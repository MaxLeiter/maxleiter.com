// import Header from '@components/header'
import styles from './layout.module.css'
import '@styles/global.css'
import AnalyticsWrapper from './analytics-wrapper'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // <ServerThemeProvider enableSystem>
    <html lang="en">
      <head></head>
      <body>
        <div className={styles.wrapper}>
          <main className={styles.main}>{children}</main>
          <div className={styles.fade} />
        </div>
        <AnalyticsWrapper />
      </body>
    </html>
    // </ServerThemeProvider>
  )
}

export const config = { runtime: 'experimental-edge' }
