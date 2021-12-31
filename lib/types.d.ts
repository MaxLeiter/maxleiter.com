export type Post = {
    title: string
    slug: string
    date: string
    tags: string[]
    description: string
    og: boolean
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
