import FilterableList from "@components/filterable-list"
import getNotes from "@lib/get-notes"
import getPosts from "@lib/get-posts"
import { getTag, renderItem } from "./render-item"


export async function ContentListRSC() {
    const [posts, notes] = await Promise.all([
        getPosts(true),
        getNotes(),
    ])

    const content = [...posts, ...notes]

    return <>
    <h2>Posts and other half-baked thoughts</h2>
    <FilterableList
        items={content}
        renderItem={renderItem}
        filterProperties={['type']}
        sortOptions={[
            { label: 'Sort by date', value: 'date' },
            { label: 'Sort by title', value: 'title' },
        ]}
        tags={getTag}
        enableSearch={false}
        enableSort={false}
        enableTags={false}
    />
    </>
}