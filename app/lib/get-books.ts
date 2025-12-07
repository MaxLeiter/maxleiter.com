import matter from 'gray-matter'
import path from 'path'
import type { Book } from './types'
import fs from 'fs/promises'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'

async function getBookCoverUrl(isbn?: string): Promise<string | undefined> {
  if (!isbn) return undefined
  const res = unstable_cache(
    async () => {
      // Open Library Covers API - returns book covers by ISBN
      return await fetch(`https://bookcover.longitood.com/bookcover/${isbn}`, {
        method: 'GET',
      }).then((res) => res.json() as { url: string })
    },
    ['book-cover', isbn],
    { revalidate: 60 * 60 * 24 * 30 },
  )

  return (await res()).url
}

export const getBooks = cache(async () => {
  try {
    const books = await fs.readdir('./books/')

    const booksWithMetadata = await Promise.all(
      books
        .filter(
          (file) =>
            path.extname(file) === '.md' || path.extname(file) === '.mdx',
        )
        .map(async (file) => {
          const filePath = `./books/${file}`
          const bookContent = await fs.readFile(filePath, 'utf8')
          const { data, content } = matter(bookContent)

          if (data.published === false) {
            return null
          }

          const book: Book = {
            title: data.title,
            description: data.description || '',
            slug: data.slug,
            author: data.author,
            isbn: data.isbn,
            date: data.date,
            rating: data.rating,
            body: content,
            coverUrl: await getBookCoverUrl(data.isbn),
            genre: data.genre,
            series: data.series,
            type: 'book',
          }

          return book
        }),
    )

    const filtered = booksWithMetadata
      .filter((book) => book !== null)
      .sort((a, b) =>
        a && b ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0,
      ) as Book[]

    return filtered
  } catch (error) {
    return []
  }
})

export async function getBook(slug: string) {
  const books = await getBooks()
  return books.find((book) => book.slug === slug)
}

export default getBooks
