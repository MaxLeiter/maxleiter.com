export type Post = {
  title: string
  slug: string
  date: string
  tags: string[]
  description: string
  body: string
  lastModified?: number
  views?: number
  // Third party only
  isThirdParty?: boolean
  href?: string
}

export type Project = {
  title: string
  description: string
  href: string
  role: string
  years: string[]
  stars?: number
}
