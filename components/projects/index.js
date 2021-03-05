import Link from '@components/link'
import styles from './projects.module.css'
import Entry from '@components/entry'

const Projects = ({ count = -1, projects }) => {
  const sliced = projects.slice(0, count > 0 ? count : projects.length);
  return (
    <ul className={styles.container}>
        {sliced.map((e) => <Entry stars={e.stars} key={e.title} href={e.href} internal={e.internal || false} title={e.title} description={e.description} role={e.role} />)}
        {count > 0 && count < projects.length &&
          <li>See the rest on <Link style={{margin: '0 auto'}} underline href="/projects"> this page</Link></li>
        }
    </ul>
  )
}

export default Projects
