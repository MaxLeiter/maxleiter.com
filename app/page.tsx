import Socials from '@components/socials'
import ProjectList from '@components/projects'
import Link from '@components/link'
import AboutMe from '@components/aboutme'
import { getProjects } from '@lib/projects'
import styles from './page.module.css'
import TimeOfDay from './timer'
import { Suspense } from 'react'
import { PostListRSC } from '@components/posts-list/rsc'
import Posts from '@components/posts-list'

const PROJECT_COUNT = 3

export const revalidate = 10800

export default async function HomePage() {
  const projects = await getProjects()

  return (
    <>
      <div className={styles.heading}>
        <h1>Max Leiter</h1>
        <Socials />
      </div>
      <AboutMe />
      <h2>My projects</h2>
      <ProjectList
        showYears={false}
        count={PROJECT_COUNT}
        projects={projects}
      />
      <h2>My posts</h2>
      <Suspense fallback={<Posts skeleton />}>
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
