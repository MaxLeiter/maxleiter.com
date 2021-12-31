import matter from 'gray-matter'
import fs from 'fs'
import path from 'path'
import type { Post } from './types'

const getPosts = () => {
  const posts = fs
    .readdirSync('./posts/')
    .filter((file) => path.extname(file) === '.md')
    .map((file) => {
      const postContent = fs.readFileSync(`./posts/${file}`, 'utf8')
      const { data, content } = matter(postContent)

      if (data.published === false) {
        return null
      }

      return { ...data, body: content } as Post
    })
    .filter(Boolean)
    .sort((a, b) => a && b ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0)

  return posts
}

export default getPosts
