import { getBooks, getBook } from '@lib/get-books'
import { notFound } from 'next/navigation'
import { BookPageClient } from './book-page-client'
import { BookContent } from '@components/book-content'

export async function generateStaticParams() {
  const books = await getBooks()
  return books.map((book) => ({ slug: book.slug }))
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>
}) {
  const params = await props.params
  const book = await getBook(params.slug)

  if (!book) return { title: 'Book Not Found' }

  return {
    title: book.title,
    description: book.description || `Review of ${book.title} by ${book.author}`,
  }
}

export default async function BookPage(props: {
  params: Promise<{ slug: string }>
}) {
  const params = await props.params
  const book = await getBook(params.slug)

  if (!book) return notFound()

  return (
    <BookPageClient slug={params.slug} title={book.title}>
      <BookContent
        slug={params.slug}
        title={book.title}
        author={book.author}
        date={book.date}
        description={book.description}
        body={book.body}
        rating={book.rating}
        coverUrl={book.coverUrl}
        series={book.series}
      />
    </BookPageClient>
  )
}
