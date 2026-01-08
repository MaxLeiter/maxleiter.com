'use client'

import { ListCard } from '@components/desktop/list-card'
import type { Note } from '@lib/types'

interface NotesContentProps {
  notes: Note[]
  onNoteClick?: (slug: string) => void
  onNoteHover?: (slug: string) => void
  onNoteHoverEnd?: () => void
}

export function NotesContent({
  notes,
  onNoteClick,
  onNoteHover,
  onNoteHoverEnd
}: NotesContentProps) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-mono font-bold mb-8" style={{ color: 'var(--article-color)' }}>notes/</h1>

      <ul className="space-y-2">
        {notes.map((note) => (
          <ListCard
            key={note.slug}
            href={`/notes/${note.slug}`}
            title={note.title}
            description={note.description}
            meta={`${note.date} • ${note.type}`}
            icon
            onClick={
              onNoteClick
                ? (e) => {
                    e.preventDefault()
                    onNoteClick(note.slug)
                  }
                : undefined
            }
            onMouseEnter={() => onNoteHover?.(note.slug)}
            onMouseLeave={onNoteHoverEnd}
          />
        ))}
      </ul>
    </div>
  )
}