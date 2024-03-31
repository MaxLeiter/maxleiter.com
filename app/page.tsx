import Socials from '@components/socials'
import ProjectList from '@components/projects'
import Link from '@components/link'
import AboutMe from '@components/aboutme'
import { getProjects } from '@lib/projects'
import styles from './page.module.css'
import TimeOfDay from './timer'
import { ContentListRSC } from '@components/content-list'

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
      {/* <PostsAndDevNotes PostList={<Suspense>
        <PostListRSC paginate={false} />
      </Suspense>}
        NoteList={<Suspense>
          <NotesListRSC />
        </Suspense>} */}
      {/* /> */}
      <ContentListRSC />
      <footer className={styles.footer}>
        <span>
          <Link href="/about">About this site</Link>
          {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ? (
            <span className={styles.gitSha}>
              <Link
                external
                href={`https://github.com/maxleiter/maxleiter.com/commit/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}`}
              >
                {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}
              </Link>
            </span>
          ) : (
            <span className={styles.gitSha}>some git SHA</span>
          )}
        </span>
        <TimeOfDay />
      </footer>
    </>
  )
}
