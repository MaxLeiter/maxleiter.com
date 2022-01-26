import { ReactNode } from "react"

export type Post = {
    title: string
    slug: string
    date: string
    tags: string[]
    description: string
    body: string
}

export type Project = {
    title: string
    description: string
    href: string
    role: string
    years: string[]
    stars?: number | string
    cardInfo?: ReactNode
}
