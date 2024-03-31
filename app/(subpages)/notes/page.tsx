import { NotesListRSC } from '@components/notes-list/rsc'
import { Suspense } from 'react'

const Blog = async () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotesListRSC paginate={true} />
    </Suspense>
  )
}

export default Blog
