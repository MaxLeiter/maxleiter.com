import Link from '@components/link'

const AboutMe = () => (
  <>
    <p>
      I&apos;m currently building{' '}
      <Link href="https://v0.app" style={{ fontFamily: 'monospace' }} external>
        v0.app
      </Link>{' '}
      at{' '}
      <Link href="https://vercel.com" external>
        Vercel
      </Link>
      . I&apos;m interested in politics, tech, and building a fast, accessible
      web.
    </p>
  </>
)

export default AboutMe
