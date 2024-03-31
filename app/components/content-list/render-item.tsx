"use client"

import BlockEntry from "@components/entry/block"
import { Note, Post } from "@lib/types"

export const renderItem = (item: Post | Note) => item.type === 'post' ? renderPost(item) : renderNote(item)
export const getTag = (post: Post | Note) => [post.type]

function renderPost(post: any) {
    return <BlockEntry
        key={post.slug}
        href={post.isThirdParty ? post.href! : `/blog/${post.slug}`}
        title={post.title}
        date={new Date(post.date)}
        description={post.description}
        isThirdParty={post.isThirdParty}
        type={post.type || 'post'}
    />
}

function renderNote(note: any) {
    return <BlockEntry
        key={note.slug}
        href={`/notes/${note.slug}`}
        title={note.title}
        date={new Date(note.date)}
        description={note.description}
        type={note.type || 'note'}
    />
}