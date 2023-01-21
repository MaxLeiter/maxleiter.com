import Link from '@components/link'

const AboutMe = () => (
  <>
    <p>
      I&apos;ve previously worked at{' '}
      <Link href="https://www.blend.com" external>
        Blend
      </Link>{' '}
      and am currently building at{' '}
      <Link href="https://vercel.com" external>
        Vercel
      </Link>
      . I&apos;m interested in politics, tech, and building a fast, accessible
      web.
    </p>
    {/* <p>
      You can view a list of talks I recommend watching or listening to on{' '}
      <Link href="/talks">this page</Link>.
    </p> */}
  </>
)

export default AboutMe
