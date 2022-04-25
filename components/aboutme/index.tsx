import Link from '@components/link'

const AboutMe = () => (
  <article>
    <p>
      I&apos;ve previously worked at{' '}
      <Link href="https://www.blend.com" external>
        Blend
      </Link>{' '}
      and in August I will be joining{' '}
      <Link href="https://vercel.com" external>
        Vercel
      </Link>
      . I&apos;m interested in politics, tech, and building a fast, accessible
      web.
    </p>
    <p>
      You can view a list of talks I recommend watching or listening to on{' '}
      <Link href="/talks">this page</Link>.
    </p>
  </article>
)

export default AboutMe
