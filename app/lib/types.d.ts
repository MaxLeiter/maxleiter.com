export type Base = {
  title: string
  description: string
  href?: string
}

export type Post = Base & {
  slug: string
  date: string
  tags: string[]
  body: string
  lastModified?: number
  views?: number
  // Third party only
  isThirdParty?: boolean
}

export type Project = Base & {
  role: string
  years: string[]
  stars?: number
}

export type Note = Base & {
  date: string
  body: string
  slug: string
}