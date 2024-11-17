import ProjectList from '@components/projects'
import Link from '@components/link'
import AboutMe from '@components/aboutme'
import { getProjects } from '@lib/projects'
import TimeOfDay from '../timer'
import { ContentListRSC } from '@components/content-list'

const PROJECT_COUNT = 3

export default async function HomePage() {
  const projects = await getProjects()

  return (
    <>
      <div className="grid gap-24 lg:gap-32 top-0 space-y-6 lg:mt-12 lg:grid-cols-[.618fr,1fr] h-full">
        <main className="space-y-6 lg:min-h-screen">
          <AboutMe />
          <ProjectList
            showYears={false}
            projects={(projects).slice(0, PROJECT_COUNT)}
            seeMore={true}
            cardClassName='justify-between'
          />
        </main>
        <ContentListRSC />
      </div>

      <footer className="flex justify-end py-12 text-sm text-gray-500">
        <span className='flex flex-col gap-2'>
          <Link href="/about">About this site</Link>
          {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ? (
            <span>
              <Link
                external
                href={`https://github.com/maxleiter/maxleiter.com/commit/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}`}
              >
                {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}
              </Link>
            </span>
          ) : (
            <span>some git SHA</span>
          )}
          <TimeOfDay />
        </span>
      </footer>
    </>
  )
}

