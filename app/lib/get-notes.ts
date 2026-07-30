import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { cache } from 'react'
import { Note } from './types'

export const getNotes = cache(async () => {
  const files = fs.readdirSync('./notes/')

  const notesWithMetadata = files
    .filter(
      (file) => path.extname(file) === '.md' || path.extname(file) === '.mdx',
    )
    .map((file) => {
      const noteContent = fs.readFileSync(`./notes/${file}`, 'utf8')
      const { data, content } = matter(noteContent)

      if (data.published === false) {
        return null
      }

      return { ...data, body: content } as Note
    })

  const filtered = notesWithMetadata
    .filter((note) => note !== null)
    .sort((a, b) =>
      a && b ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0,
    ) as Note[]

  return filtered
})

export async function getNote(slug: string) {
  const notes = await getNotes()
  return notes.find((note) => note.slug === slug)
}

export default getNotes
