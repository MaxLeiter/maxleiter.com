import matter from 'gray-matter'
import fs from 'fs/promises'
import path from 'path'
import type { Post } from './types'
import dateExtractor from 'git-date-extractor'

const getPosts = async () => {
  const posts = await fs
    .readdir('./posts/')

  const postsWithMetadata = await Promise.all(posts.filter((file) => path.extname(file) === '.md')
    .map(async (file) => {
      const path = `./posts/${file}`
      const postContent = await fs.readFile(path, 'utf8')
      const { data, content } = matter(postContent)

      if (data.published === false) {
        return null
      }

      // use git to get last modified date for a path
      const fileStamp = await dateExtractor.getStamps({
        outputToFile: false,
        projectRootPath: "./",
        files: [path],
        debug: false,
      })
      const lastModified = Object.values(fileStamp)[0].modified
      const lastModifiedTime = lastModified ? new Date(lastModified as number * 1000).getTime() : undefined;
      return { ...data, body: content, lastModified: lastModifiedTime } as Post
    }));
  const filtered = postsWithMetadata.filter(Boolean).sort((a, b) => a && b ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0)
  return filtered
}

export default getPosts
