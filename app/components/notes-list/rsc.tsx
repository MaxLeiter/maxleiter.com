import getNotes from '@lib/get-notes'
import NotesList from '.'

export async function NotesListRSC({ paginate }: { paginate?: boolean }) {
  const notes = await getNotes()
  return <NotesList notes={notes} paginate={paginate} />
}
