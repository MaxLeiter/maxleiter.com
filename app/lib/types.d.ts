export type Post = {
  title: string
  slug: string
  date: string
  tags: string[]
  description: string
  body: string
  lastModified?: number
  views?: number
}

export type Project = {
  title: string
  description: string
  href: string
  role: string
  years: string[]
  stars?: number
}

declare global {
  // eslint-disable-next-line no-unused-vars
  namespace NodeJS {
    // eslint-disable-next-line no-unused-vars
    interface Global {
      octokit: Octokit
    }
  }
}
