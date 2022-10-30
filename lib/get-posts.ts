import matter from 'gray-matter'
import path from 'path'
import type { Post } from './types'
import fs from 'fs/promises'

const getPosts = async () => {
  const posts = await fs.readdir('./posts/')

  const postsWithMetadata = await Promise.all(
    posts
      .filter((file) => path.extname(file) === '.md')
      .map(async (file) => {
        const filePath = `./posts/${file}`
        const postContent = await fs.readFile(filePath, 'utf8')
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

        // let viewCount = 0

        // const { data: views } = await supabase.from('analytics').select('view_count').filter('slug', 'eq', `/blog/${data.slug}`);

        // if (views?.length) {
        //   viewCount = views[0].view_count
        // }

        return { ...data, body: content } as Post
      })
  )
  const filtered = postsWithMetadata
    .filter((post) => post !== null)
    .sort((a, b) =>
      a && b ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0
    ) as Post[]
  return filtered
}

export const getPost = async (slug: string) => {
  const posts = await getPosts()
  return posts.find((post) => post.slug === slug)
}

// Edge version, without FS access
// const getPosts = async () => {
//   const posts = await fetch(
//     'https://api.github.com/repos/maxleiter/maxleiter.com/contents/posts?ref=master'
//   )
//   const postsJson = await posts.json()
//   const postsWithMetadata = await Promise.all(
//     postsJson
//       .filter((file: any) => path.extname(file.name) === '.md')
//       .map(async (file: any) => {
//         const postContent = await fetch(file.download_url)
//         const postContentText = await postContent.text()
//         const { data, content } = matter(postContentText)

//         if (data.published === false) {
//           return null
//         }

//         return { ...data, body: content } as Post
//       })
//   )
//   const filtered = postsWithMetadata
//     .filter((post) => post !== null)
//     .sort((a, b) =>
//       a && b ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0
//     ) as Post[]
//   return filtered
// }

// export const getPost = async (slug: string) => {
//   const post = await fetch(
//     `https://api.github.com/repos/maxleiter/maxleiter.com/contents/posts/${slug}.md?ref=master`
//   )
//   const postJson = await post.json()
//   const postContent = await fetch(postJson.download_url)
//   const postContentText = await postContent.text()
//   const { data, content } = matter(postContentText)

//   return { ...data, body: content } as Post
// }

export default getPosts
