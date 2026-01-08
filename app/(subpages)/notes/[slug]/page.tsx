import getNotes, { getNote } from '@lib/get-notes'
import { notFound } from 'next/navigation'
import { NotePageClient } from './note-page-client'
import { NoteContent } from '@components/note-content'

export async function generateStaticParams() {
  const notes = await getNotes()
  return notes.map((note) => ({ slug: note.slug }))
}

export default async function NotePage(props: {
  params: Promise<{
    slug: string
  }>
}) {
  const params = await props.params
  const note = await getNote(params.slug)

  if (!note) return notFound()

  return (
    <NotePageClient slug={params.slug} title={note.title}>
      <NoteContent
        slug={params.slug}
        title={note.title}
        date={note.date}
        description={note.description}
        body={note.body}
        type={note.type}
      />
    </NotePageClient>
  )
}