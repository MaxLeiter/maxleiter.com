import getNotes from '@lib/get-notes'
import { WindowToolbar } from '@components/desktop/window-toolbar'
import { ViewTransitionWrapper } from '@components/view-transition-wrapper'
import { NotesContent } from '@components/content/notes-content'

export default async function NotesPage() {
  const notes = await getNotes()

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col">
      <WindowToolbar
        title="notes"
        segments={[{ name: 'notes', href: '/notes' }]}
      />

      <main className="flex-1 overflow-auto p-6">
        <ViewTransitionWrapper name="page-notes">
          <NotesContent notes={notes} />
        </ViewTransitionWrapper>
      </main>
    </div>
  )
}