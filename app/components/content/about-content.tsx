interface AboutContentProps {
  content?: {
    bio: {
      content: string
      title: string
      links?: Array<{ text: string; url: string }>
    }
  }
}

export function AboutContent({ content }: AboutContentProps) {
  const aboutData = content || {
    bio: {
      content:
        "I'm currently building v0 at Vercel. I'm interested in politics, tech, and building a fast, accessible web.",
      title: 'About',
      links: [
        { text: 'v0.app', url: 'https://v0.app' },
        { text: 'vercel.com', url: 'https://vercel.com' },
      ],
    },
  }

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
          <p className="mb-4">{aboutData.bio.content}</p>
          {aboutData.bio.links && (
            <div className="flex gap-4 mb-4">
              {aboutData.bio.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--link)] hover:opacity-80 underline transition-opacity"
                >
                  {link.text}
                </a>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-mono font-bold mb-3 text-[var(--fg)]">
            This site
          </h2>
          <p>
            This site is built on{' '}
            <a
              className="text-[var(--link)] hover:opacity-80 underline transition-opacity"
              href="https://nextjs.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              Next.js 16
            </a>{' '}
            with the App Router and is deployed via{' '}
            <a
              className="text-[var(--link)] hover:opacity-80 underline transition-opacity"
              href="https://vercel.com/home"
              target="_blank"
              rel="noopener noreferrer"
            >
              Vercel
            </a>
            . You can view the source on{' '}
            <a
              className="text-[var(--link)] hover:opacity-80 underline transition-opacity"
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
