import PostFooter from '@components/post-footer'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* <Head>
        {hidden && <meta name="robots" content="noindex" />}
        {date && <meta name="date" content={date} />}
      </Head> */}
      <article>{children}</article>
      <PostFooter />
      {/* <Navigation previous={previous} next={next} /> */}
    </>
  )
}
