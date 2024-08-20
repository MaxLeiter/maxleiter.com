"use client"

import BlockEntry from "@components/entry/block"
import { Note, Post } from "@lib/types"

export const renderItem = (item: Post | Note) => item.type === 'post' ? renderPost(item) : renderNote(item)
export const getTag = (post: Post | Note) => [post.type === 'post' ? 'post' : 'note']

function renderPost(post: Post) {
    return <BlockEntry
        key={post.slug || post.href}
        href={post.isThirdParty ? post.href! : `/blog/${post.slug}`}
        title={post.title}
        date={new Date(post.date)}
        description={post.description}
        isThirdParty={post.isThirdParty}
        type={post.type || 'post'}
    />
}

function renderNote(note: Note) {
    return <BlockEntry
        key={note.slug}
        href={`/notes/${note.slug}`}
        title={note.title}
        date={new Date(note.date)}
        description={note.description}
        type={note.type || 'note'}
    />
}