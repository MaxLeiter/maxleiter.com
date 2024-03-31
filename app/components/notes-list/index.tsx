'use client'

import { useState } from 'react'

import BlockEntry from '@components/entry/block'
import styles from '../posts-list/posts-list.module.css'
import type { Note } from '@lib/types'

type Props =
  | {
    notes: Note[]
    paginate?: boolean
  }
  | {
    skeleton: true
  }

const NotesList = (props: Props) => {
  const [showMore, setShowMore] = useState(4)

  if ('skeleton' in props) {
    return (
      <ul className={styles.container}>
        {[...Array(4)].map((_, i) => (
          <BlockEntry key={i} skeleton />
        ))}
      </ul>
    )
  }

  const { notes, paginate } = props

  return (
    <ul className={styles.container}>
      {notes.slice(0, paginate ? showMore : undefined).map((note) => {
        const date = new Date(note.date).toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
        })

        return (
          <BlockEntry
            // TODO: Math.random is a bad hack.
            key={`note-item-${note.slug || Math.random()}`}
            href={`/notes/${note.slug}`}
            title={note.title}
            date={new Date(date)}
            description={note.description}
          />
        )
      })}
      {paginate && showMore < notes.length && (
        <button
          onClick={() => {
            setShowMore(showMore + 4)
          }}
          className={styles.button}
        >
          Show More
        </button>
      )}
    </ul>
  )
}

export default NotesList
