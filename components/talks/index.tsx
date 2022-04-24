import React from "react"
import Page from "@components/page"
import type { Talk } from "pages/talks"
import VideoCard from "./video-card"
import styles from './talks.module.css'
import Input from "@components/input"
const Talks = ({
    talks,
}: {
    talks: Array<Talk>,
}) => {
    const [search, setSearch] = React.useState('')
    const [sort, setSort] = React.useState<'date' | 'title' | 'views' | 'likes'>('views')
    const [asc, setAsc] = React.useState(false)

    const filteredTalks = React.useMemo(
        () => {
            const filtered = search ? talks.filter(talk => talk.title.toLowerCase().includes(search.toLowerCase()) || talk.description.toLowerCase().includes(search.toLowerCase())) : talks
            const sorted = filtered.sort((a, b) => {
                if (sort === 'date') {
                    const aDate = new Date(a.date)
                    const bDate = new Date(b.date)
                    if (aDate > bDate) {
                        return asc ? 1 : -1
                    } else if (aDate < bDate) {
                        return asc ? -1 : 1
                    } else {
                        return 0
                    }
                } else if (sort === 'title') {
                    if (asc) {
                        return a.title.localeCompare(b.title)
                    } else {
                        return b.title.localeCompare(a.title)
                    }
                } else if (sort === 'views') {
                    if (!a.views) {
                        return 1
                    } else if (!b.views) {
                        return -1
                    } else {
                        if (asc) {
                            return a.views - b.views
                        } else {
                            return b.views - a.views
                        }
                    }
                } else if (sort === 'likes') {
                    if (!a.likes) {
                        return 1
                    } else if (!b.likes) {
                        return -1
                    } else {
                        if (asc) {
                            return a.likes - b.likes
                        } else {
                            return b.likes - a.likes
                        }
                    }
                } else {
                    return 0
                }
            })
            return sorted
        }, [asc, search, sort, talks]
    )

    const onSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        console.log(e.target.value)
        setSort(e.target.value as 'date' | 'title' | 'views' | 'likes')
    }

    return (
        <>
            <Page
                header={false}
                title=""
                description="A curated and sortable list of interesting tech talks"
            >
                <h1>Talks I&apos;ve enjoyed</h1>
                <div className={styles.filterSettings}>
                    <Input value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search"
                        aria-label="Search talk titles and descriptions"
                    />
                    <span className={styles.selects}>
                        <select className={styles.sort} value={sort} onChange={onSortChange}>
                            <option value="date">Sort by date</option>
                            <option value="title">Sort by title</option>
                            <option value="views">Sort by views</option>
                            <option value="likes">Sort by likes</option>
                        </select>
                        <select className={styles.sort} value={asc.toString()} onChange={(e) => setAsc(e.target.value === 'true')}>
                            <option value="false">Descending</option>
                            <option value="true">Ascending</option>
                        </select>
                    </span>
                </div>
                <div className={styles.talks} key={sort}>
                    {filteredTalks.map(
                        (talk) => {
                            return <VideoCard key={talk.id} talk={talk} />
                        }
                    )}
                </div>
            </Page>
        </>
    )
}

export default Talks
