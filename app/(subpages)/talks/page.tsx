import { WindowToolbar } from '@components/desktop/window-toolbar'
import { ViewTransitionWrapper } from '@components/view-transition-wrapper'
import { TalksContent } from '@components/content/talks-content'

export const metadata = {
  title: 'Talks',
  description: 'Tech talks I enjoy from around the web',
  alternates: {
    canonical: 'https://maxleiter.com/talks',
  },
}

export default function TalksPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col">
      <WindowToolbar
        title="talks"
        segments={[{ name: 'talks', href: '/talks' }]}
      />

      <main className="flex-1 overflow-auto p-6">
        <ViewTransitionWrapper name="page-talks">
          <TalksContent />
        </ViewTransitionWrapper>
      </main>
    </div>
  )
}
