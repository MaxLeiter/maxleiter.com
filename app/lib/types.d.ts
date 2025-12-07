export type Base = {
  title: string
  description: string
  href?: string
}

export type Post = Base & {
  // Not defined for third party posts
  slug: string | undefined
  date: string
  tags: string[]
  body: string
  lastModified?: number
  views?: number
  // Third party only
  isThirdParty?: boolean
  type: 'post'
}

export type Project = Base & {
  role: string
  years: string[]
  stars?: number
  type: 'project'
}

export type Note = Base & {
  date: string
  body: string
  slug: string
  type: 'snippet' | 'tip' | 'note'
}

export type BookGenre = 'sci-fi' | 'fantasy' | 'non-fiction' | 'horror' | 'thriller'

export type Book = Base & {
  slug: string
  author: string
  isbn?: string
  date: string // date read/reviewed
  rating?: number // out of 5
  body: string
  coverUrl?: string
  genre?: BookGenre
  series?: {
    name: string
    books: {
      title: string
      isbn?: string
    }[]
  }
  type: 'book'
}
