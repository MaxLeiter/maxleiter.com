import PostsList from '@components/posts-list'
import Socials from '@components/socials'
import ProjectList from '@components/projects'
import Link from '@components/link'
import AboutMe from '@components/aboutme'
import getPosts from '@lib/get-posts'
import { getProjects } from '@lib/projects'
import Header from '@components/header'

const PROJECT_COUNT = 3

const fetchPosts = async () => {
  const posts = await getPosts()
  return posts || []
}

const fetchProjects = async () => {
  const projects = await getProjects()
  return projects || []
}

const Index = async () => {
  const posts = await fetchPosts()
  const projects = await fetchProjects()

  return (
    <article>
      <Header render={false} title="" />
      <h1 style={{ margin: 0, color: 'var(--link)' }}>Max Leiter</h1>
      <h2 style={{ margin: 0 }}>Full-stack developer</h2>
      <Socials />
      <h3>About me</h3>
      <AboutMe />
      <h3>My projects</h3>
      <ProjectList
        showYears={false}
        count={PROJECT_COUNT}
        projects={projects}
      />
      <h3>My posts</h3>
      <PostsList posts={posts} paginate={false} />
      <footer>
        <Link href="/about">About this site</Link>
        {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA && (
          <>
            {' '}
            &mdash;{' '}
            <Link
              external
              href={`https://github.com/maxleiter/maxleiter.com/commit/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}`}
            >
              {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}
            </Link>
          </>
        )}
      </footer>
    </article>
  )
}

export default Index
