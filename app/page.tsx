import Socials from '@components/socials'
import ProjectList from '@components/projects'
import Link from '@components/link'
import AboutMe from '@components/aboutme'
import { getProjects } from '@lib/projects'
import styles from './page.module.css'
import TimeOfDay from './timer'
import { Suspense } from 'react'
import { PostListRSC } from '@components/posts-list/rsc'

const PROJECT_COUNT = 3

const fetchProjects = () => {
  const projects = getProjects()
  return projects || []
}

const Index = async () => {
  const projects = fetchProjects()

  return (
    <>
      <div className={styles.heading}>
        <span className={styles.headingText}>
          <h1>Max Leiter</h1>
          <h2>Full-stack developer</h2>
        </span>
        <Socials />
      </div>
      <h3 className={styles.secondHeading}>About me</h3>
      <AboutMe />
      <h3>My projects</h3>
      <ProjectList
        showYears={false}
        count={PROJECT_COUNT}
        projects={projects}
      />
      <h3>My posts</h3>
      <Suspense fallback={<div>Loading...</div>}>
        {/* @ts-expect-error async rsc support */}
        <PostListRSC paginate={false} />
      </Suspense>
      <footer className={styles.footer}>
        <span>
          <Link href="/about">About this site</Link>
          {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ? (
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
          ) : (
            <> &mdash; some git SHA</>
          )}
        </span>
        <TimeOfDay />
      </footer>
    </>
  )
}

export default Index

export const dynamic = 'force-static'
