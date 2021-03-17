import styles from './rss.module.css'
import Entry from '@components/entry/text'
import useSWR from 'swr'
import { useState } from 'react'

const fetcher = url => fetch(url).then(r => r.json())
const RESULTS_PER_PAGE = 20

const Feed = ({ page }) => {
    const { data, error } = useSWR(`/api/rss?start=${(page) *  RESULTS_PER_PAGE}&stop=${RESULTS_PER_PAGE * (page + 1)}`, fetcher)
    if (error) return <div>failed to load</div>
    if (!data) return <div>loading...</div>
    const { items } = data;
  
    return items.map(({ item, name, org }) => {
        const type = org === item.creator ? "" : `${org} ${item.creator ? "—" : ""} ${item.creator}`

        return <Entry key={item.guid} title={item.title} date={new Date(item.pubDate)} type={type} description={item.description} href={item.link}/>
    })
}

const RSS = ({ count = -1, projects, showYears = true }) => {
    const [page, setPage] = useState(0)

    return (
        <>
            <ul className={styles.container}>
                <Feed page={page} />
                <div style={{ display: 'none' }}><Feed page={page + 1}/></div>
            </ul>
            <button
                onClick={() => {
                    setPage(page + 1)
                }}
                className={styles.button}
            >
                Show More
            </button>
        </>
    )
}

export default RSS
