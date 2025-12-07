'use client'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import type { Book, BookGenre } from '@lib/types'

interface BooksContentProps {
  books: Book[]
  onBookClick?: (slug: string) => void
}

const GENRE_LABELS: Record<BookGenre, string> = {
  'sci-fi': 'Sci-Fi',
  'fantasy': 'Fantasy',
  'non-fiction': 'Non-Fiction',
  'horror': 'Horror',
  'thriller': 'Thriller',
}

function GenreFilter({
  genres,
  selected,
  onSelect,
}: {
  genres: BookGenre[]
  selected: BookGenre | null
  onSelect: (genre: BookGenre | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 text-xs font-mono rounded-full border transition-colors ${
          selected === null
            ? 'bg-white/10 border-white/20 text-white'
            : 'border-white/10 text-white/60 hover:text-white/80 hover:border-white/20'
        }`}
      >
        All
      </button>
      {genres.map((genre) => (
        <button
          key={genre}
          onClick={() => onSelect(genre)}
          className={`px-3 py-1.5 text-xs font-mono rounded-full border transition-colors ${
            selected === genre
              ? 'bg-white/10 border-white/20 text-white'
              : 'border-white/10 text-white/60 hover:text-white/80 hover:border-white/20'
          }`}
        >
          {GENRE_LABELS[genre]}
        </button>
      ))}
    </div>
  )
}

function BookCard({
  book,
  onClick,
}: {
  book: Book
  onClick?: (slug: string) => void
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault()
      onClick(book.slug)
    }
  }

  return (
    <li>
      <Link
        href={`/books/${book.slug}`}
        className="flex gap-4 p-3 rounded hover:bg-white/5 transition-colors border border-white/10 group"
        onClick={handleClick}
      >
        {book.coverUrl && (
          <div className="flex-shrink-0 w-16 h-24 bg-white/5 rounded overflow-hidden border border-white/10">
            <img
              src={book.coverUrl}
              alt={`Cover of ${book.title}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-mono text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
            {book.title}
          </h2>
          <p className="text-sm text-white/60 mt-0.5">{book.author}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-white/40 font-mono">{book.date}</span>
          </div>
          {book.description && (
            <p className="text-xs text-white/50 mt-2 line-clamp-2">
              {book.description}
            </p>
          )}
        </div>
      </Link>
    </li>
  )
}

export function BooksContent({ books, onBookClick }: BooksContentProps) {
  const [selectedGenre, setSelectedGenre] = useState<BookGenre | null>(null)

  const availableGenres = useMemo(() => {
    const genres = new Set<BookGenre>()
    books.forEach((book) => {
      if (book.genre) genres.add(book.genre)
    })
    return Array.from(genres).sort()
  }, [books])

  const filteredBooks = useMemo(() => {
    if (!selectedGenre) return books
    return books.filter((book) => book.genre === selectedGenre)
  }, [books, selectedGenre])

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-mono font-bold mb-8 text-white/90">
        books/
      </h1>

      <p className="text-white/60 font-mono text-sm mb-6">
        Some of the books I&apos;ve read and enjoyed.
      </p>

      {availableGenres.length > 0 && (
        <GenreFilter
          genres={availableGenres}
          selected={selectedGenre}
          onSelect={setSelectedGenre}
        />
      )}

      {filteredBooks.length === 0 ? (
        <p className="text-white/60 font-mono text-sm">No books yet.</p>
      ) : (
        <ul className="space-y-2">
          {filteredBooks.map((book) => (
            <BookCard key={book.slug} book={book} onClick={onBookClick} />
          ))}
        </ul>
      )}
    </div>
  )
}
