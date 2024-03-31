import { cache } from 'react'
import { readFiles } from './read-files'
import { Note } from './types'

export const getNotes = cache(async () => {
  const notesWithMetadata = readFiles<Note>('./notes/')

  const filtered = notesWithMetadata
    .filter((post) => post !== null)
    .sort((a, b) =>
      a && b ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0,
    )

  return filtered
})

export async function getNote(slug: string) {
  const notes = await getNotes()
  return notes.find((post) => post.slug === slug)
}

export default getNotes
