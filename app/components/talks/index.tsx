// @ts-nocheck
'use client'

import React from 'react'
// import type { Talk } from 'app/(subpages)/talks/page-backup'
import VideoCard from './video-card'
import styles from './talks.module.css'
import Input from '@components/input'
import PostFooter from '@components/content-footer/post-footer'
import Badge from '@components/badge'
import tagStyles from './tags.module.css'

type SortOption = 'date' | 'title' | 'views' | 'likes' | 'length'
type Talk = any

const Talks = ({ talks }: { talks: Array<Talk> }) => {
  const [search, setSearch] = React.useState('')
  const [sort, setSort] = React.useState<SortOption>('views')
  const [asc, setAsc] = React.useState(false)
  const [selectedTags, setSelectedTags] = React.useState<Array<string>>([])

  const filteredTalks = React.useMemo(() => {
    const filteredBySearch = search
      ? talks.filter(
          (talk) =>
            talk.title.toLowerCase().includes(search.toLowerCase()) ||
            talk.description.toLowerCase().includes(search.toLowerCase())
        )
      : talks
    const filteredByTags = selectedTags.length
      ? filteredBySearch.filter((talk) =>
          selectedTags.every((tag) => talk.tags?.includes(tag))
        )
      : filteredBySearch
    const sorted = filteredByTags.sort((a, b) => {
      if (sort === 'date') {
        const aDate = new Date(a.date)
        const bDate = new Date(b.date)
        if (aDate > bDate) {
          return asc ? 1 : -1
        } else if (aDate < bDate) {
          return asc ? -1 : 1
        }
        return 0
      } else if (sort === 'title') {
        if (asc) {
          return a.title.localeCompare(b.title)
        }
        return b.title.localeCompare(a.title)
      } else if (sort === 'views') {
        if (!a.views) {
          return 1
        } else if (!b.views) {
          return -1
        }
        if (asc) {
          return a.views - b.views
        }
        return b.views - a.views
      } else if (sort === 'likes') {
        if (!a.likes) {
          return 1
        } else if (!b.likes) {
          return -1
        }
        if (asc) {
          return a.likes - b.likes
        }
        return b.likes - a.likes
      } else if (sort === 'length') {
        if (asc) {
          return a.lengthSeconds - b.lengthSeconds
        }
        return b.lengthSeconds - a.lengthSeconds
      }
      return 0
    })
    return sorted
  }, [asc, search, selectedTags, sort, talks])

  const onSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSort(e.target.value as SortOption)
  }

  const allTagsWithCount = React.useMemo(() => {
    const tags = filteredTalks.reduce((acc, talk) => {
      talk.tags?.forEach((tag) => {
        if (acc[tag]) {
          acc[tag]++
        } else {
          acc[tag] = 1
        }
      })
      return acc
    }, {} as { [tag: string]: number })
    return Object.entries(tags).sort((a, b) => {
      if (a[1] > b[1]) {
        return -1
      } else if (a[1] < b[1]) {
        return 1
      }
      if (a[0] > b[0]) {
        return 1
      } else if (a[0] < b[0]) {
        return -1
      }
      return 0
    })
  }, [filteredTalks])

  const onTagClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const tag = e.currentTarget.textContent
    if (!tag) return

    const tagWithoutCount = tag.substring(0, tag.lastIndexOf(' '))
    const newSelectedTags = selectedTags.includes(tagWithoutCount)
      ? selectedTags.filter((t) => t !== tagWithoutCount)
      : [...selectedTags, tagWithoutCount]
    setSelectedTags(newSelectedTags)
  }

  return (
    <>
      <div className={styles.filterSettings}>
        <Input
          value={search}
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
            <option value="length">Sort by length</option>
          </select>
          <select
            className={styles.sort}
            value={asc.toString()}
            onChange={(e) => setAsc(e.target.value === 'true')}
          >
            <option value="false">Descending</option>
            <option value="true">Ascending</option>
          </select>
        </span>
      </div>
      <div className={tagStyles.tags} style={{ marginBottom: 'var(--gap)' }}>
        {allTagsWithCount.map((tag) => (
          <Badge
            key={`sort-${tag[0]}`}
            className={`${tagStyles.tag} ${
              selectedTags.includes(tag[0]) ? tagStyles.selected : ''
            }`}
          >
            <a onClick={onTagClick}>
              {tag[0]} ({tag[1]})
            </a>
          </Badge>
        ))}
      </div>
      <div className={styles.talks} key={sort}>
        {filteredTalks.map((talk) => {
          return <VideoCard key={talk.id} talk={talk} />
        })}
      </div>
      <PostFooter />
    </>
  )
}

export default Talks
