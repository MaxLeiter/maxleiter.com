// import Header from '@components/header'
import styles from '@components/page/page.module.css'
import '@styles/global.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <title>Max Leiter&apos;s Website</title>
      </head>
      <body>
        <div className={styles.wrapper}>
          {/* <Head
            title={`${title ? `${title} - ` : ''}Max Leiter`}
            description={description}
            image={image}
          /> */}
          <main className={styles.main}>{children}</main>
          <div className={styles.fade} />
        </div>
      </body>
    </html>
  )
}

export const config = { runtime: 'experimental-edge' }
