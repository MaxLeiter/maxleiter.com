import { WindowToolbar } from '@components/desktop/window-toolbar'
import { ViewTransitionWrapper } from '@components/view-transition-wrapper'
import { AboutContent } from '@components/content/about-content'

export const metadata = {
  title: 'About',
  description: 'About this website.',
  alternates: {
    canonical: 'https://maxleiter.com/about',
  },
}

const About = () => {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col">
      <WindowToolbar
        title="about"
        segments={[{ name: 'about', href: '/about' }]}
      />

      <main className="flex-1 overflow-auto p-6">
        <ViewTransitionWrapper name="page-about">
          <AboutContent />
        </ViewTransitionWrapper>
      </main>
    </div>
  )
}

export default About
