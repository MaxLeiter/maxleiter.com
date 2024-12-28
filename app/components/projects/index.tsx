import Link from '@components/link'
import styles from './projects.module.css'
import { Entry } from '@components/entry'

import type { Project } from '@lib/types'
// import { Star } from '@components/icons'

type Props = {
  projects: Project[]
  showYears: boolean
  seeMore: boolean;
}

const Projects = ({ projects = [], seeMore = false, showYears = true }: Props) => {
  projects.sort((a, b) => parseInt(b.years[0]) - parseInt(a.years[0]))

  return (
    <ul className={styles.container}>
      {projects.map((e) => {
        return (
          <Entry
            showYears={showYears}
            years={e.years}
            key={e.title}
            href={e.href || ""}
            title={e.title}
            description={e.description}
            role={e.role}
            stars={e.stars}
          />
        )
      })}
      {seeMore && (
        <li>
          See some more on <Link href="/projects"> this page</Link>
        </li>
      )}
    </ul>
  )
}

export default Projects
