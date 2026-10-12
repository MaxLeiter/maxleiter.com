import { Row, Rows } from '@components/blades/blade-page'
import type { Note } from '@framework/shared/types'
import { transitionName } from '@framework/shared/transitions'

interface NotesContentProps {
  notes: Note[]
}

export function NotesContent({ notes }: NotesContentProps) {
  return (
    <Rows>
      {notes.map((note) => (
        <Row
          key={note.slug}
          href={`/notes/${note.slug}`}
          title={note.title}
          desc={note.description}
          meta={`${note.date} · ${note.type}`}
          icon="note"
          vt={transitionName('note', note.slug)}
        />
      ))}
    </Rows>
  )
}
