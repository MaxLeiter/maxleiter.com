import Socials from '@components/socials'
import ProjectList from '@components/projects'
import Link from '@components/link'
import AboutMe from '@components/aboutme'
import { getProjects } from '@lib/projects'
import styles from './page.module.css'
import TimeOfDay from '../../timer'
import { ContentListRSC } from '@components/content-list'

const PROJECT_COUNT = 3

export default async function HomePage() {
  const projects = await getProjects()

  return (
    <>
      <AboutMe />
      <Socials />
      <h2 style={{ padding: 'var(--gap-quarter) 0' }}>My projects</h2>
      <ProjectList
        showYears={false}
        projects={(projects).slice(0, PROJECT_COUNT)}
        seeMore={true}
      />
      {/* <PostsAndDevNotes PostList={<Suspense>
        <PostListRSC paginate={false} />
      </Suspense>}
        NoteList={<Suspense>
          <NotesListRSC />
        </Suspense>} */}
      {/* /> */}
      <h2 style={{ padding: 'var(--gap-quarter) 0' }}> Posts and other half-baked thoughts</h2>
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
