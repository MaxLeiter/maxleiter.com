"use client";
import Badge from "@components/badge"
import Input from "@components/input"
import React from "react"
import { Base } from "@lib/types"
import { useSearchParams } from "next/navigation";
import { RenderItem } from "@components/content-list/render-item";
import { motion } from "framer-motion";

const linkStyles: React.CSSProperties = {
    textDecoration: 'none',
    color: 'inherit'
}

const selectedBadgeStyles: React.CSSProperties = {
    backgroundColor: 'var(--fg)',
    color: 'var(--bg)'
}


// uses router.replace so next.js doesn't refetch in RSC (we have the data already)
function FakeLink({ href, children }: { href: string, children: React.ReactNode }) {
    return (
        <a
            href={href}
            onClick={(e) => {
                e.preventDefault()
                window.history.replaceState({}, '', href)
            }}
            style={linkStyles}
        >
            {children}
        </a>
    )
}

const FilterableList = <T extends Base>({
    items,
    tags,
    enableSearch = true,
    enableTags = true
}: {
    items: Array<T>
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

    return (
        <>
            {enableSearch ? <div className="flex flex-row items-center justify-between">
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                    aria-label="Search items"
                />
            </div> : null}
            {enableTags && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.1 }}
                    className="flex gap-1 mb-8 text-muted-foreground"
                >
                    <Badge
                        key="all"
                        style={selectedTag ? {} : selectedBadgeStyles}
                    >
                        <FakeLink href={'?'} >
                            All
                        </FakeLink>
                    </Badge>
                    {allTags.map(([tag, count]) => (
                        <Badge
                            key={tag}
                            style={selectedTag === tag ? selectedBadgeStyles : {}}
                        >
                            <FakeLink href={tagHref(tag)} >
                                {tag} <span>
                                    ({count})
                                </span>
                            </FakeLink>
                        </Badge>
                    ))}
                </motion.div>
            )}
            <ul aria-live="polite" aria-relevant="additions removals">
                {filteredItems.map((item, i) => (
                    <li key={item.title} className='mb-4'>
                        <RenderItem postOrNote={item as any} index={i} />
                    </li>
                ))}
            </ul>
        </>
    )
}

export default FilterableList