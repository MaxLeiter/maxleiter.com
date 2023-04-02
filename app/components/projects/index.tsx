import Link from '@components/link'
import styles from './projects.module.css'
import { Entry } from '@components/entry'

import type { Project } from '@lib/types'
// import { Star } from '@components/icons'

type Props = {
  count: number
  projects: Project[]
  showYears: boolean
}

const Projects = ({ count = -1, projects = [], showYears = true }: Props) => {
  const sliced = projects.slice(0, count > 0 ? count : projects.length)
  sliced.sort((a, b) => parseInt(b.years[0]) - parseInt(a.years[0]))

  return (
    <ul className={styles.container}>
      {sliced.map((e) => {
        return (
          <Entry
            showYears={showYears}
            years={e.years}
            key={e.title}
            href={e.href}
            title={e.title}
            description={e.description}
            role={e.role}
            stars={e.stars}
          />
        )
      })}
      {count > 0 && count < projects.length && (
        <li>
          See some more on <Link href="/projects"> this page</Link>
        </li>
      )}
    </ul>
  )
}

export default Projects
