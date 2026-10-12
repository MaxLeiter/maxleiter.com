const external = { target: '_blank', rel: 'noopener noreferrer' } as const

export function AboutContent() {
  return (
    <div className="pb-prose">
      <section>
        <h2>Max Leiter</h2>
        <p>
          I'm currently working on Claude Code at Anthropic. Previously, I
          helped start{' '}
          <a href="https://v0.app" {...external}>
            v0
          </a>{' '}
          and the{' '}
          <a href="https://ai-sdk.dev" {...external}>
            AI SDK
          </a>{' '}
          at Vercel. I'm interested in politics, tech, and building a fast,
          accessible web.
        </p>
      </section>

      <section>
        <h2>This site</h2>
        <p>
          This site was previously built with{' '}
          <a href="https://nextjs.org" {...external}>
            Next.js
          </a>
          , but has been replaced with a{' '}
          <a href="/blog/thank-u-next">vibe-coded framework</a>. It's deployed
          via{' '}
          <a href="https://vercel.com/home" {...external}>
            Vercel
          </a>{' '}
          and you can view the source on{' '}
          <a href="https://github.com/maxleiter/maxleiter.com" {...external}>
            GitHub
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p className="pb-links">
          <a className="btn" href="https://github.com/maxleiter" {...external}>
            GitHub
          </a>
          <a className="btn" href="https://twitter.com/maxleiter" {...external}>
            Twitter
          </a>
          <a
            className="btn"
            href="https://www.linkedin.com/in/MaxLeiter"
            {...external}
          >
            LinkedIn
          </a>
        </p>
      </section>
    </div>
  )
}
