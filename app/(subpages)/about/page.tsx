import { WindowToolbar } from '@components/desktop/window-toolbar'
import { ViewTransitionWrapper } from '@components/view-transition-wrapper'
import { AboutContent } from '@components/content/about-content'
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
      <WindowToolbar
        title="about"
        segments={[{ name: 'about', href: '/about' }]}
      />

      <div className="flex-1 overflow-auto p-6">
        <ViewTransitionWrapper name="page-about">
          <AboutContent content={ABOUT_CONTENT} />
        </ViewTransitionWrapper>
      </div>
    </div>
  )
}

export default About
