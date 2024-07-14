"use client";
import Badge from "@components/badge"
import Input from "@components/input"
import React from "react"
import styles from './filterable-list.module.css'
import { Base } from "@lib/types"
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const FilterableList = <T extends Base>({
    items,
    renderItem,
    tags,
    enableSearch = true,
    enableTags = true
}: {
    items: Array<T>
    // eslint-disable-next-line no-unused-vars
    renderItem: (item: T) => React.ReactNode
    // eslint-disable-next-line no-unused-vars
    tags?: (item: T) => Array<string>
    enableSearch?: boolean
    enableTags?: boolean
}) => {
    const [search, setSearch] = React.useState('')
    const searchParams = useSearchParams();
    const selectedTag = searchParams?.get('tag')

    const filteredItems = React.useMemo(() => {
        const filtered = items.filter((item) => {
            if (selectedTag && search) {
                return tags?.(item)?.includes(selectedTag) &&
                    (item.title.toLowerCase().includes(search.toLowerCase()) ||
                        item.description.toLowerCase().includes(search.toLowerCase()))
            }

            if (selectedTag) {
                return tags?.(item)?.includes(selectedTag)
            }

            if (search) {
                return item.title.toLowerCase().includes(search.toLowerCase()) ||
                    item.description.toLowerCase().includes(search.toLowerCase())
            }

            return true
        })

        return filtered
    }, [items, search, selectedTag, tags])

    const tagHref = (tag: string) => {
        const newParams = new URLSearchParams(searchParams?.toString())
        newParams.set('tag', tag)
        return `?${newParams.toString()}`
    }

    const allTags = React.useMemo(() => {
        const tagCounts: { [tag: string]: number } = {}
        items.forEach((item) => {
            const itemTags = tags?.(item) || []
            itemTags.forEach((tag) => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1
            })
        })
        return Object.entries(tagCounts).sort((a, b) => b[1] - a[1])
    }, [items, tags])

    const selectedBadgeStyles: React.CSSProperties = {
        backgroundColor: 'var(--fg)',
        color: 'var(--bg)'
    }

    const linkStyles: React.CSSProperties = {
        textDecoration: 'none',
        color: 'inherit'
    }

    return (
        <>
            {enableSearch ? <div className={styles.filterSettings}>
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                    aria-label="Search items"
                />
            </div> : null}
            {enableTags && (
                <div style={{ paddingTop: 2, marginBottom: 'var(--gap)', display: 'flex', gap: 'var(--gap-half)' }}>
                    <Badge
                        key="all"
                        style={selectedTag ? {} : selectedBadgeStyles}
                    >
                        <Link href={tagHref('')} scroll={false} style={linkStyles}>
                            All
                        </Link>
                    </Badge>
                    {allTags.map(([tag, count]) => (
                        <Badge
                            key={tag}
                            style={selectedTag === tag ? selectedBadgeStyles : {}}
                        >
                            <Link href={tagHref(tag)} scroll={false} style={linkStyles}>
                                {tag} <span className={styles.count}>
                                    ({count})
                                </span>
                            </Link>
                        </Badge>
                    ))}
                </div>
            )}
            <ul className={styles.items} aria-live="polite" aria-relevant="additions removals">
                {filteredItems.map((item) => renderItem(item))}
            </ul>
        </>
    )
}

export default FilterableList