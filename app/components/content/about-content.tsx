const LINK = 'text-[var(--link)] hover:opacity-80 underline transition-opacity'

export function AboutContent() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-mono font-bold mb-8 text-[var(--fg)]">
        about/
      </h1>

      <div className="space-y-6 text-[var(--gray)] leading-relaxed">
        <section>
          <h2 className="text-xl font-mono font-bold mb-3 text-[var(--fg)]">
            Max Leiter
          </h2>
          <p className="mb-4">
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
          <h2 className="text-xl font-mono font-bold mb-3 text-[var(--fg)]">
            This site
          </h2>
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
          <h2 className="text-xl font-mono font-bold mb-3 text-[var(--fg)]">
            Contact
          </h2>
          <div className="flex gap-6">
            <a
              href="https://github.com/maxleiter"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[var(--link)] hover:opacity-80 transition-opacity"
            >
              GitHub
            </a>
            <a
              href="https://twitter.com/maxleiter"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[var(--link)] hover:opacity-80 transition-opacity"
            >
              Twitter
            </a>
            <a
              href="https://www.linkedin.com/in/MaxLeiter"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[var(--link)] hover:opacity-80 transition-opacity"
            >
              LinkedIn
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
