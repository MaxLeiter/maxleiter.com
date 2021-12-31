export type Post = {
    title: string
    slug: string
    date: string
    tags: string[]
    description: string
    published: boolean
    body: string
}

export type Project = {
    title: string
    description: string
    href: string
    role: string
    years: string[]
}
