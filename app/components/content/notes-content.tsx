import { EntryList } from '@components/lists'
import type { Note } from '@framework/shared/types'

interface NotesContentProps {
  notes: Note[]
}

export function NotesContent({ notes }: NotesContentProps) {
  return (
    <>
      <h1 className="ui-title">Notes</h1>
      <p className="ui-lede">Short-form thoughts, code snippets, and tips.</p>
      <EntryList
        items={notes.map((note) => ({
          href: `/notes/${note.slug}`,
          title: note.title,
          seed: `note:${note.slug}`,
          meta: `${note.type}  ·  ${note.date}`.toUpperCase(),
          chip: 'Note',
          desc: note.description,
        }))}
      />
    </>
  )
}
