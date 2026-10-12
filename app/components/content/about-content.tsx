import { Cover } from '@components/cover'

const LINK = 'ui-link'

export function AboutContent() {
  return (
    <div className="ui-col">
      <header className="ui-head">
        <div className="ui-head-art">
          <Cover
            seed="profile:max-leiter"
            title="Max Leiter"
            meta="PROFILE  ·  MAXLEITER.COM"
            chip="Profile"
            eager
          />
        </div>
        <div className="ui-head-text">
          <p className="ui-kicker">About</p>
          <h1 className="ui-title">Max Leiter</h1>
        </div>
      </header>

      <div className="ui-copy">
        <section>
          <h2 className="ui-h2">Now</h2>
          <p>
            I'm currently working on Claude Code at Anthropic. Previously, I
            helped start{' '}
            <a
              className={LINK}
              href="https://v0.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              v0
            </a>{' '}
            and the{' '}
            <a
              className={LINK}
              href="https://ai-sdk.dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              AI SDK
            </a>{' '}
            at Vercel. I'm interested in politics, tech, and building a fast,
            accessible web.
          </p>
        </section>

        <section>
          <h2 className="ui-h2">This site</h2>
          <p>
            This site was previously built with{' '}
            <a
              className={LINK}
              href="https://nextjs.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              Next.js
            </a>
            , but has been replaced with a{' '}
            <a className={LINK} href="/blog/thank-u-next">
              vibe-coded framework
            </a>
            . It's deployed via{' '}
            <a
              className={LINK}
              href="https://vercel.com/home"
              target="_blank"
              rel="noopener noreferrer"
            >
              Vercel
            </a>{' '}
            and you can view the source on{' '}
            <a
              className={LINK}
              href="https://github.com/maxleiter/maxleiter.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="ui-h2">Contact</h2>
          <div className="ui-links">
            <a
              href="https://github.com/maxleiter"
              target="_blank"
              rel="noopener noreferrer"
              className="ui-pill"
            >
              GitHub
            </a>
            <a
              href="https://twitter.com/maxleiter"
              target="_blank"
              rel="noopener noreferrer"
              className="ui-pill"
            >
              Twitter
            </a>
            <a
              href="https://www.linkedin.com/in/MaxLeiter"
              target="_blank"
              rel="noopener noreferrer"
              className="ui-pill"
            >
              LinkedIn
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
