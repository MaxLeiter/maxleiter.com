import Page from '@components/page'
import Link from '@components/link'

const About = () => {
  return (
    <Page title="About" description="About this website">
      <article>
        <p>
          This site is built on{' '}
          <Link external href="https://nextjs.com">
            Next.js
          </Link>{' '}
          and deployed via{' '}
          <Link external href="https://vercel.com/home">
            Vercel
          </Link>
          . The icons are from{' '}
          <Link external href="https://feathericons.com/">
            Feather Icons
          </Link>
          . You can view the source on{' '}
          <Link external href="https://github.com/maxleiter/maxleiter.com">
            GitHub
          </Link>
          .
        </p>
      </article>
    </Page>
  )
}

export default About