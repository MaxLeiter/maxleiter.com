import { WindowToolbar } from '@components/desktop/window-toolbar'
import { ViewTransitionWrapper } from '@components/view-transition-wrapper'
import { LabsContent } from '@components/content/labs-content'

export const metadata = {
  title: 'Labs',
  description: 'Experimental projects and playthings',
  alternates: {
    canonical: 'https://maxleiter.com/labs',
  },
}

export default function LabsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col">
      <WindowToolbar
        title="labs"
        segments={[{ name: 'labs', href: '/labs' }]}
      />

      <main className="flex-1 overflow-auto p-6">
        <ViewTransitionWrapper name="page-labs">
          <LabsContent />
        </ViewTransitionWrapper>
      </main>
    </div>
  )
}
