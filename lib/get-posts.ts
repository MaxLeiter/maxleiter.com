import matter from 'gray-matter'
import fs from 'fs/promises'
import path from 'path'
import type { Post } from './types'

const getPosts = async () => {
  const posts = await fs.readdir('./posts/')

  const postsWithMetadata = await Promise.all(
    posts
      .filter((file) => path.extname(file) === '.md')
      .map(async (file) => {
        const path = `./posts/${file}`
        const postContent = await fs.readFile(path, 'utf8')
        const { data, content } = matter(postContent)

        if (data.published === false) {
          return null
        }
        // remote leading ./ from path
        // const withoutLeadingChars = path.substring(2)

        // const commitInfoResponse = await fetch(`https://api.github.com/repos/maxleiter/maxleiter.com/commits?path=${withoutLeadingChars}&page=1&per_page=1`, {
        //   headers: {
        //     "Authorization": process.env.GITHUB_TOKEN ?? "",
        //   },
        // })
        // const commitInfo = await commitInfoResponse.json()
        // let lastModified = 0;
        // if (commitInfo?.length) {
        //   lastModified = new Date(commitInfo[0].commit.committer.date * 1000).getTime()
        // }

        return { ...data, body: content } as Post
      })
  )
  const filtered = postsWithMetadata
    .filter(Boolean)
    .sort((a, b) =>
      a && b ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0
    )
  return filtered
}

export default getPosts
