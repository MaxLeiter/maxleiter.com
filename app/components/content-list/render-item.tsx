"use client"

import { Button } from "@components/ui/button"
import { Note, Post } from "@lib/types"
import { motion, useInView } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { useRef } from "react"

export const getTag = (post: Post | Note) => [post.type === 'post' ? 'post' : 'note']

export function RenderItem({ postOrNote, index }: { postOrNote: Post | Note, index: number }) {
    const ref = useRef<HTMLDivElement>(null)
    // @ts-expect-error null?
    const isInView = useInView(ref, {
        // Only trigger once
        once: true,
        // Amount of element that needs to be visible to trigger animation (0-1)
        amount: 0.1,
    })

    const shouldAnimate = isInView || index === 0
    const href = postOrNote.type === 'post' ? `/posts/${postOrNote.slug}` : ("isThirdParty" in postOrNote && postOrNote.isThirdParty) ? postOrNote.href : `/notes/${postOrNote.slug}` || ""
    const isThirdParty = "isThirdParty" in postOrNote ? postOrNote.isThirdParty : false
    const readingTime = `${(postOrNote.body.length / 238).toFixed(0)} min read`

    return <motion.div
        key={postOrNote.title}
        initial={{ opacity: 0, y: 20 }}
        animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ delay: 0.1 }}
        className="relative group"
        ref={ref}
    >
        <Link href={href || ""}>
            <h3 className="p-0 text-3xl font-medium tracking-tight">
                <div className="text-blue-500 group-hover:text-foreground">
                    {postOrNote.title}
                </div>
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <time dateTime={postOrNote.date}>{new Date(postOrNote.date).toLocaleDateString()}</time>
                <span>•</span>
                <span>{postOrNote.type}</span>
                <span>•</span>
                {isThirdParty ? <span>{new URL(postOrNote.href!).hostname}</span> : <span>{readingTime}</span>}

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
    </motion.div >
}