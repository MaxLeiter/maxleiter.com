'use client'

import { Button } from '@components/ui/button'
import { Note, Post } from '@lib/types'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { useRef } from 'react'

export const getTag = (post: Post | Note) => [
    post.type === 'post' ? 'post' : 'note',
]

export function RenderItem({
    postOrNote,
}: {
    postOrNote: Post | Note
}) {
    const ref = useRef<HTMLDivElement>(null)

    const href =
        'isThirdParty' in postOrNote && postOrNote.isThirdParty
            ? postOrNote.href
            : postOrNote.type === 'post'
                ? `/blog/${postOrNote.slug}`
                : `/notes/${postOrNote.slug}` || ''
    const isThirdParty =
        'isThirdParty' in postOrNote ? postOrNote.isThirdParty : false

    return (
        <div
            className="relative group"
            ref={ref}
        >
            <Link href={href || ''}>
                <h3 className="p-0 text-3xl font-medium tracking-tight">
                    <div className="text-blue-500 group-hover:text-foreground">
                        {postOrNote.title}
                    </div>
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <time dateTime={postOrNote.date}>
                        {new Date(postOrNote.date).toLocaleDateString()}
                    </time>
                    <span>•</span>
                    <span>{postOrNote.type}</span>
                    {isThirdParty ? (
                        <>
                            <span>•</span>
                            <span>{new URL(postOrNote.href!).hostname}</span>
                        </>
                    ) : null}
                </div>
                {postOrNote.description && (
                    <p className="text-muted-foreground">{postOrNote.description}</p>
                )}
                <Button
                    variant="link"
                    size="sm"
                    className="flex h-auto gap-0.5 p-0 transition-all opacity-0 text-muted-foreground group-hover:translate-x-1 group-hover:opacity-100 group-hover:text-foreground"
                    aria-hidden
                >
                    Read
                    <ArrowUpRight className="w-3 h-3 transform translate-y-[0.05rem]" />
                </Button>
            </Link>
        </div>
    )
}
