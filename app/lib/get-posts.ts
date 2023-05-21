import matter from 'gray-matter'
import { Octokit } from '@octokit/rest'
import type { Post } from './types'
import { cache } from 'react'
// import supabase from '@lib/supabase/private'
import { promises as fs } from 'fs'

// const octokit = new Octokit({
//   auth: process.env.GITHUB_TOKEN,
//   request: {
//     fetch,
//   },
// })

// save octokit to global if exists, otherwise create new instance and save to global
const octokit = global.octokit ?? new Octokit({
  auth: process.env.GITHUB_TOKEN,
  request: {
    fetch,
  },
})

if (!global.octokit) {
  global.octokit = octokit
}

type GithubFile = {
  type: 'file' | 'dir' | 'submodule' | 'symlink'
  size: number
  name: string
  path: string
  content?: string | undefined
  sha: string
  url: string
  git_url: string | null
  html_url: string | null
  download_url: string | null
  _links: any
}

const getPosts = cache(async () => {
  const repoOwner = 'maxleiter'
  const repoName = 'maxleiter.com'
  const postsDir = 'posts'

  if (process.env.NODE_ENV === "development") {
    const posts = await Promise.all(
      (await fs.readdir(`${process.cwd()}/posts`)).map(async (file) => {
        const postContent = await fs.readFile(
          `${process.cwd()}/posts/${file}`,
          'utf8'
        )
        const { data, content } = matter(postContent)
        return { ...data, body: content } as Post
      }
    ))

    return posts.sort((a, b) =>
      a && b ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0
    ) as Post[]

  }

  const { data: files } = (await octokit.repos.getContent({
    owner: repoOwner,
    repo: repoName,
    path: postsDir,
  })) as { data: GithubFile[] }

  const postsWithMetadata = await Promise.all(
    files
      .filter(
        (file) =>
          file.type === 'file' &&
          (file.path.endsWith('.md') || file.path.endsWith('.mdx'))
      )
      .map(async (file) => {
        const { data: fileContent } = (await octokit.repos.getContent({
          owner: repoOwner,
          repo: repoName,
          path: file.path,
        })) as { data: GithubFile }

        if (!fileContent.content) {
          return null
        }

        const postContent = Buffer.from(fileContent.content, 'base64').toString(
          'utf8'
        )
        const { data, content } = matter(postContent)

        if (data.published === false) {
          return null
        }

        const withoutLeadingChars = file.path.replace('.mdx', '.md')

        const fetchUrl =
          process.env.NODE_ENV === 'production'
            ? `https://api.github.com/repos/${repoOwner}/${repoName}/commits?path=${withoutLeadingChars}&page=1&per_page=1`
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

        // let views = 0

        // const { data: viewCount } = await supabase
        //   .from('analytics')
        //   .select('view_count')
        //   .filter('slug', 'eq', `/blog/${data.slug}`)

        // if (viewCount?.length) {
        //   views = viewCount[0].view_count
        // }

        return { ...data, body: content, lastModified } as Post
      })
  )
  const filtered = postsWithMetadata
    .filter((post) => post !== null)
    .sort((a, b) =>
      a && b ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0
    ) as Post[]
  return filtered
})

export const getPost = async (slug: string) => {
  const posts = await getPosts()
  return posts.find((post) => post.slug === slug)
}

export default getPosts
