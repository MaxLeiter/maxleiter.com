import matter from 'gray-matter'
import fs from 'fs'
import path from 'path'
import type { Post } from './types'

const getPosts = () => {
  const posts = fs
    .readdirSync('./posts/')
    .filter((file) => path.extname(file) === '.md')
    .map((file) => {
      const path = `./posts/${file}`
      const postContent = fs.readFileSync(path, 'utf8')
      const { mtime } = fs.statSync(path)
      const { data, content } = matter(postContent)

      if (data.published === false) {
        return null
      }

      return { ...data, body: content, lastModified: mtime.getTime() } as Post
    })
    .filter(Boolean)
    .sort((a, b) => a && b ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0)

  return posts
}

export default getPosts
