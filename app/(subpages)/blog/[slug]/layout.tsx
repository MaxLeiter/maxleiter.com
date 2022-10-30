
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* <Head>
        {hidden && <meta name="robots" content="noindex" />}
        {date && <meta name="date" content={date} />}
      </Head> */}
      <article>{children}</article>
    </>
  )
}
export const config = { runtime: 'experimental-edge' }
