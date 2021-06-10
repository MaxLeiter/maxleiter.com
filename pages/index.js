import Page from '@components/page'
import Link from '@components/link'
import PostsList from '@components/posts-list'
import Socials from '@components/socials'
import ProjectList from '@components/projects'
import getPosts from '@lib/get-posts'
import getProjects from '@lib/projects'

const PROJECT_COUNT = 4

const About = ({ posts, projects }) => {
  return (
    <Page
      header={false}
      title=""
      description="Max Leiter's personal website and projects."
    >
      <article>
        <h1
          style={{ margin: 0, color: 'var(--link)', display: 'inline-block' }}
        >
          Max Leiter
        </h1>
        <h2 style={{ margin: 0, lineHeight: '2.7rem' }}>
          Full-stack developer and student
        </h2>
        <Socials />
        <p>
          I've previously worked at{' '}
          <Link underline href="https://vercel.com" external>
            Vercel
          </Link>{' '}
          and{' '}
          <Link underline href="https://www.uscannenbergmedia.com" external>
            Annenberg Media
          </Link>
          . This summer, I'm working as a software intern at{' '}
          <Link underline href="https://blend.com" external>
            Blend
          </Link>{' '}
          on automation. I'm interested in politics, tech, and building a fast,
          accessible web.
        </p>

        <h3>My projects</h3>
        <ProjectList
          showYears={false}
          count={PROJECT_COUNT}
          projects={projects}
        />
        <h3>My posts</h3>
        <PostsList posts={posts} />
        <p>
          <Link href="/about">About this site</Link>
        </p>
      </article>
    </Page>
  )
}

export const getStaticProps = async () => {
  const posts = getPosts()
  const projects = await getProjects()

  return {
    props: {
      posts,
      projects,
    },
  }
}

export const config = {
  unstable_runtimeJS: false,
}

export default About
