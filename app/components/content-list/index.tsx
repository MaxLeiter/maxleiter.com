import FilterableList from "@components/filterable-list"
import getNotes from "@lib/get-notes"
import getPosts from "@lib/get-posts"
import { getTag, renderItem } from "./render-item"
import { Suspense } from "react"


export async function ContentListRSC() {
    const [posts, notes] = await Promise.all([
        getPosts(true),
        getNotes(),
    ])

    const content = [...posts, ...notes].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

    return <>
        {/* Suspense for useSearchParams */}
        <Suspense fallback={null}>
            <FilterableList
                items={content}
                renderItem={renderItem}
                tags={getTag}
                enableSearch={false}
                enableTags={true}
            />
        </Suspense>
    </>
}