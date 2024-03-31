import { TerminalWindow } from '@components/terminal'
import getNotes, { getNote } from '@lib/get-notes'
import { Code } from 'bright'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const posts = await getNotes()
  return posts.map((post) => ({ slug: post.slug }))
}

export default async function NotePage({
  params,
}: {
  params: {
    slug: string
  }
}) {
  const post = await getNote(params.slug)
  if (!post) return notFound()

  const src = `
---
title: ${post.title}
description: ${post.description || ''}
slug: ${post.slug}
date: ${post.date}
type: ${post.type}
---
${post.body.trim()}
`

  return <TerminalWindow>
    <Code lang="mdx" style={{ margin: 0, padding: 0 }}>
      {src.trim()}
    </Code>
  </TerminalWindow>
}
