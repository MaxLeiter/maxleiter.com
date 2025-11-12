'use server'

import { getPost } from './get-posts'

export async function getBlogPostContent(slug: string): Promise<string | null> {
  const post = await getPost(slug)
  return post?.body || null
}
