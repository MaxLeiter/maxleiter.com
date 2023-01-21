import Link from '@components/link'

const About = () => {
  return (
    <article>
      <p>
        This site is built on the{' '}
        <Link external href="https://nextjs.com">
          Next.js 13
        </Link>{' '}
        App Directory and is deployed via{' '}
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
  )
}

export default About
export const config = { runtime: 'experimental-edge' }
