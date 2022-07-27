import PostsList from '@components/posts-list'
import Socials from '@components/socials'
import ProjectList from '@components/projects'
import Link from '@components/link'
import AboutMe from '@components/aboutme'
import Page from '@components/page'
import getPosts from '@lib/get-posts'
import getProjects from '@lib/projects'
import { Post, Project } from '@lib/types'

const PROJECT_COUNT = 3

const Index = ({ posts, projects }: { posts: Post[]; projects: Project[] }) => {
  return (
    <>
      <Page
        header={false}
        title=""
        description="Max Leiter's personal website and projects."
      >
        <article>
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
      </Page>
    </>
  )
}

export const getStaticProps = async () => {
  const posts = await getPosts()
  const projects = await getProjects()

  return {
    props: {
      posts,
      projects,
    },
  }
}

export default Index
