import { useState } from 'react'
import dynamic from 'next/dynamic'

import PostsList from '@components/posts-list'
import Socials from '@components/socials'
import ProjectList from '@components/projects'
import Link from '@components/link'
import AboutMe from '@components/aboutme'
import Page from '@components/page'
import getPosts from '@lib/get-posts'
import getProjects from '@lib/projects'
// import RSS from '@components/icons/rss'
// import ShiftBy from '@components/ShiftBy'
import PauseIcon from '@components/icons/pause'
import PlayIcon from '@components/icons/play'
import FadeIn from '@components/fade-in'
import Tooltip from '@components/tooltip'

const PROJECT_COUNT = 4

const GoL = dynamic(() => import('@components/game-of-life'))

const Index = ({ posts, projects }) => {
  const [running, setRunning] = useState(false)

  const Icon = () => (
    <Tooltip text={running ? 'pause' : 'easteregg'} onClick={() => setRunning(!running)} style={{cursor: 'pointer', color: 'var(--lightest-gray)', fontSize: 14}}>
      {running ? <PauseIcon /> : <PlayIcon />}
    </Tooltip>
  )

  return (
    <>
      <FadeIn>
        {running && <GoL running={running} />}
      </FadeIn>
      {/* <Link href="#" > */}

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
          <Icon />
          <h3>About me</h3>
          <AboutMe />
          <h3>My projects</h3>
          <ProjectList
            showYears={false}
            count={PROJECT_COUNT}
            projects={projects}
          />
          <h3>My posts</h3>
          <PostsList posts={posts} />
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
  // unstable_runtimeJS: false,
}

export default Index
