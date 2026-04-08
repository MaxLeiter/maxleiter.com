import getNotes, { getNote } from '@lib/get-notes'
import { notFound } from 'next/navigation'
import { NotePageClient } from './note-page-client'
import { NoteContent } from '@components/note-content'

export async function generateStaticParams() {
  const notes = await getNotes()
  return notes.map((note) => ({ slug: note.slug }))
}

function EmbedInitScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(${(() => {
          const urlParams = new URLSearchParams(window.location.search)
          const isEmbed = urlParams.get('embed') !== null

          window.__IS_EMBED__ = isEmbed

          if (isEmbed) {
            const toolbar = document.getElementById('blog-toolbar')
            if (toolbar) {
              toolbar.remove()
            }
          }
        }).toString()})()`,
      }}
    />
  )
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
    <>
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
      <EmbedInitScript />
    </>
  )
}