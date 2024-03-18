import matter from 'gray-matter'
import path from 'path'
import type { Post } from './types'
import fs from 'fs/promises'
import { cache } from 'react'
// import supabase from '@lib/supabase/private'

const thirdPartyPosts: Post[] = [
  {
    title: 'Introducing the Vercel AI SDK',
    description: "An interoperable, streaming-enabled, edge-ready software development kit for AI apps built with React and Svelte.",
    body: '',
    date: '2023-06-15T13:00:00.000Z',
    slug: '',
    tags: [],
    lastModified: 0,
    isThirdParty: true,
    href: 'https://vercel.com/blog/introducing-the-vercel-ai-sdk'
  },
  {
    title: 'Improving the accessibility of our Next.js site',
    description: "We've made some improvements to the accessibility of our Next.js site. Here's how we did it.",
    body: '',
    date: '2022-09-30T13:00:00.000Z',
    slug: '',
    tags: [],
    lastModified: 0,
    isThirdParty: true,
    href: 'https://vercel.com/blog/improving-the-accessibility-of-our-nextjs-site'
  }
]

export const getPosts = cache(async (includeThirdPartyPosts?: boolean) => {
  const posts = await fs.readdir('./posts/')

  const postsWithMetadata = await Promise.all(
    posts
      .filter(
        (file) => path.extname(file) === '.md' || path.extname(file) === '.mdx'
      )
      .map(async (file) => {
        const filePath = `./posts/${file}`
        const postContent = await fs.readFile(filePath, 'utf8')
        const { data, content } = matter(postContent)

        if (data.published === false) {
          return null
        }
        const withoutLeadingChars = filePath.substring(2).replace('.mdx', '.md')

        const fetchUrl =
          process.env.NODE_ENV === 'production'
            ? `https://api.github.com/repos/maxleiter/maxleiter.com/commits?path=${withoutLeadingChars}&page=1&per_page=1`
            : `http://localhost:3000/mock-commit-response.json`

        const commitInfoResponse = await fetch(fetchUrl, {
          headers: {
            Authorization: process.env.GITHUB_TOKEN ?? '',
          },
        })
        const commitInfo = await commitInfoResponse.json()
        let lastModified = 0
        if (commitInfo?.length) {
          lastModified = new Date(commitInfo[0].commit.committer.date).getTime()

          if (
            lastModified - new Date(data.date).getTime() <
            24 * 60 * 60 * 1000
          ) {
            lastModified = 0
          }
        }

        return { ...data, body: content, lastModified } as Post
      })
  )

  const postsWithMetadataAndThirdPartyPosts = [
    ...postsWithMetadata,
    ...(includeThirdPartyPosts ? thirdPartyPosts : [])
  ]

  const filtered = postsWithMetadataAndThirdPartyPosts
    .filter((post) => post !== null)
    .sort((a, b) =>
      a && b ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0
    ) as Post[]

  return filtered
})

export async function getPost(slug: string) {
  const posts = await getPosts()
  return posts.find((post) => post.slug === slug)
}

export default getPosts