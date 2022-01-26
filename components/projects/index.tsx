import Link from '@components/link'
import styles from './projects.module.css'
import Entry from '@components/entry'

import type { Project } from "@lib/types"
import { Star } from '@components/icons'

type Props = {
  count: number
  projects: Project[]
  showYears: boolean
}

const Projects = ({ count = -1, projects, showYears = true }: Props) => {
  const sliced = projects.slice(0, count > 0 ? count : projects.length)
  sliced.sort((a, b) => parseInt(b.years[0]) - parseInt(a.years[0]))

  return (
    <ul className={styles.container}>
      {sliced.map((e) => {
        // const yearsText = e.years.length > 1 ? <><b>Years:</b> {e.years[0]} - {e.years[1]}</> : <><b>Year:</b> {e.years[0]}</>
        // const shouldShowHovercard = e.stars && e.stars > -1 ? true : showYears ? false : true
        return (
          <Entry
            showYears={showYears}
            years={e.years}
            // stars={e.stars}
            key={e.title}
            href={e.href}
            title={e.title}
            description={e.description}
            role={e.role}
            // hovercard={shouldShowHovercard && <div className={styles.card}>
            //   {!showYears && yearsText}
            //   {e.stars && e.stars > -1 && <div className={styles.stars}><b>GitHub</b> <Star size={16} />: {e.stars}</div>}
            //   {/* @ts-ignore */}
            //   {!!e.cardInfo && <div dangerouslySetInnerHTML={{__html: e.cardInfo}}
            //    />}
            // </div>} 
            />
        )
      })}
      {count > 0 && count < projects.length && (
        <li>
          See some more on{' '}
          <Link href="/projects">
            {' '}
            this page
          </Link>
        </li>
      )}
    </ul>
  )
}

export default Projects
