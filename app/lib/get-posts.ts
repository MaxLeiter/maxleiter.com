import matter from 'gray-matter'
import path from 'path'
import type { Post } from './types'
import fs from 'fs/promises'
import { cache } from 'react'
import { externalPosts } from './external-posts'


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
    ...(includeThirdPartyPosts ? externalPosts : []),
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
