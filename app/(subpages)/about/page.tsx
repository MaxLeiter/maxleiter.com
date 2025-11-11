import { BreadcrumbNav } from '@components/desktop/breadcrumb-nav'
import { ABOUT_CONTENT } from '@lib/portfolio-data'

export const metadata = {
  title: 'About',
  description: 'About this website.',
  alternates: {
    canonical: 'https://maxleiter.com/about',
  },
}

const About = () => {
  return (
    <div className="min-h-screen bg-black text-white/90 flex flex-col">
      <BreadcrumbNav segments={[{ name: 'about', href: '/about' }]} />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-mono font-bold mb-8 text-white/90">
            about/
          </h1>

          <div className="space-y-6 text-white/70 leading-relaxed">
            <section>
              <h2 className="text-xl font-mono font-bold mb-3 text-white/90">
                Max Leiter
              </h2>
              <p className="mb-4">
                {ABOUT_CONTENT.bio.content}
              </p>
              {ABOUT_CONTENT.bio.links && (
                <div className="flex gap-4 mb-4">
                  {ABOUT_CONTENT.bio.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      {link.text}
                    </a>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-mono font-bold mb-3 text-white/90">
                This site
              </h2>
              <p>
                This site is built on{' '}
                <a
                  className="text-blue-400 hover:text-blue-300 underline"
                  href="https://nextjs.org"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Next.js 15
                </a>{' '}
                with the App Directory and is deployed via{' '}
                <a
                  className="text-blue-400 hover:text-blue-300 underline"
                  href="https://vercel.com/home"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Vercel
                </a>
                . You can view the source on{' '}
                <a
                  className="text-blue-400 hover:text-blue-300 underline"
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
              <h2 className="text-xl font-mono font-bold mb-3 text-white/90">
                Contact
              </h2>
              <div className="flex gap-6">
                <a
                  href="https://github.com/maxleiter"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  GitHub
                </a>
                <a
                  href="https://twitter.com/max_leiter"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Twitter
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default About
