import { getBooks } from '@lib/get-books'
import { WindowToolbar } from '@components/desktop/window-toolbar'
import { ViewTransitionWrapper } from '@components/view-transition-wrapper'
import { BooksContent } from '@components/content/books-content'

export const metadata = {
  title: 'Books',
  description: 'Books I have read with brief reviews and thoughts',
  alternates: {
    canonical: 'https://maxleiter.com/books',
  },
}

export default async function BooksPage() {
  const books = await getBooks()

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col">
      <WindowToolbar
        title="books"
        segments={[{ name: 'books', href: '/books' }]}
      />

      <main className="flex-1 overflow-auto p-6">
        <ViewTransitionWrapper name="page-books">
          <BooksContent books={books} />
        </ViewTransitionWrapper>
      </main>
    </div>
  )
}
