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
            ? 'bg-white/10 dark:bg-white/10 border-white/20 dark:border-white/20'
            : 'border-white/10 dark:border-white/10 text-white/60 dark:text-white/60 hover:text-white/80 dark:hover:text-white/80 hover:border-white/20 dark:hover:border-white/20'
        }`}
        style={{
          backgroundColor: selected === null ? 'rgba(229, 229, 229, 0.1)' : 'transparent',
          borderColor: selected === null ? 'rgba(229, 229, 229, 0.2)' : 'rgba(229, 229, 229, 0.1)',
          color: selected === null ? 'var(--fg)' : 'var(--fg)',
          opacity: selected === null ? 1 : 0.6,
        }}
      >
        All
      </button>
      {genres.map((genre) => (
        <button
          key={genre}
          onClick={() => onSelect(genre)}
          className={`px-3 py-1.5 text-xs font-mono rounded-full border transition-colors ${
            selected === genre
              ? 'bg-white/10 dark:bg-white/10 border-white/20 dark:border-white/20'
              : 'border-white/10 dark:border-white/10 text-white/60 dark:text-white/60 hover:text-white/80 dark:hover:text-white/80 hover:border-white/20 dark:hover:border-white/20'
          }`}
          style={{
            backgroundColor: selected === genre ? 'rgba(229, 229, 229, 0.1)' : 'transparent',
            borderColor: selected === genre ? 'rgba(229, 229, 229, 0.2)' : 'rgba(229, 229, 229, 0.1)',
            color: selected === genre ? 'var(--fg)' : 'var(--fg)',
            opacity: selected === genre ? 1 : 0.6,
          }}
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
        className="flex gap-4 p-3 rounded transition-colors border group"
        onClick={handleClick}
        style={{
          borderColor: 'var(--border-color)',
          backgroundColor: 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(229, 229, 229, 0.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        {book.coverUrl && (
          <div
            className="flex-shrink-0 w-16 h-24 rounded overflow-hidden border"
            style={{
              backgroundColor: 'rgba(229, 229, 229, 0.05)',
              borderColor: 'var(--border-color)',
            }}
          >
            <img
              src={book.coverUrl}
              alt={`Cover of ${book.title}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2
            className="font-mono text-sm font-semibold transition-colors group-hover:opacity-100"
            style={{
              color: 'var(--fg)',
              opacity: 0.9,
            }}
          >
            {book.title}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg)', opacity: 0.6 }}>{book.author}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs font-mono" style={{ color: 'var(--fg)', opacity: 0.4 }}>{book.date}</span>
          </div>
          {book.description && (
            <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--fg)', opacity: 0.5 }}>
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
      <h1 className="text-3xl font-mono font-bold mb-8" style={{ color: 'var(--fg)' }}>
        books/
      </h1>

      <p className="font-mono text-sm mb-6" style={{ color: 'var(--fg)', opacity: 0.6 }}>
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
        <p className="font-mono text-sm" style={{ color: 'var(--fg)', opacity: 0.6 }}>No books yet.</p>
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
