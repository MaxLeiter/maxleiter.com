import { Hero } from '@components/hero'
import { PostsSection } from '@components/posts-section'
import { ProjectsSection } from '@components/projects-section'
import Link from '@components/link'
import styles from './page.module.css'
import TimeOfDay from '../../timer'

export default async function HomePage() {
  return (
    <div className={styles.homePage}>
      <Hero />
      <ProjectsSection />
      <PostsSection />
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
    </div>
  )
}
