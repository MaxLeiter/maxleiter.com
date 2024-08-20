import matter from 'gray-matter'
import path from 'path'
import type { Post } from './types'
import fs from 'fs/promises'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'

const thirdPartyPosts: Post[] = [
  {
    title: 'Introducing AI SDK 3.0 with Generative UI support',
    description:
      'Stream React Components from LLMs to deliver richer user experiences.',
    body: '',
    date: '2024-03-01T10:00:00.000Z',
    slug: '',
    tags: [],
    lastModified: 0,
    isThirdParty: true,
    href: 'https://vercel.com/blog/ai-sdk-3-generative-ui',
    type: 'post',
  },
  {
    title: 'Introducing the Vercel AI SDK',
    description:
      'An interoperable, streaming-enabled, edge-ready software development kit for AI apps built with React and Svelte.',
    body: '',
    date: '2023-06-15T13:00:00.000Z',
    slug: '',
    tags: [],
    lastModified: 0,
    isThirdParty: true,
    href: 'https://vercel.com/blog/introducing-the-vercel-ai-sdk',
    type: 'post',
  },
  {
    title: 'Improving the accessibility of our Next.js site',
    description:
      "We've made some improvements to the accessibility of our Next.js site. Here's how we did it.",
    body: '',
    date: '2022-09-30T13:00:00.000Z',
    slug: '',
    tags: [],
    lastModified: 0,
    isThirdParty: true,
    href: 'https://vercel.com/blog/improving-the-accessibility-of-our-nextjs-site',
    type: 'post',
  },
]

export const getPosts = cache(async (includeThirdPartyPosts?: boolean) => {
  const posts = await fs.readdir('./posts/')

  const postsWithMetadata = await Promise.all(
    posts
      .filter(
        (file) => path.extname(file) === '.md' || path.extname(file) === '.mdx',
      )
      .map(async (file) => {
        const filePath = `./posts/${file}`
        const postContent = await fs.readFile(filePath, 'utf8')
        const { data, content } = matter(postContent)

        if (data.published === false) {
          return null
        }

        return { ...data, body: content, type: 'post' } as Post
      }),
  )

  const postsWithMetadataAndThirdPartyPosts = [
    ...postsWithMetadata,
    ...(includeThirdPartyPosts ? thirdPartyPosts : []),
  ]

  const filtered = postsWithMetadataAndThirdPartyPosts
    .filter((post) => post !== null)
    .sort((a, b) =>
      a && b ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0,
    ) as Post[]

  return filtered
})

export async function getPost(slug: string) {
  const posts = await getPosts()
  return posts.find((post) => post.slug === slug)
}

export default getPosts
