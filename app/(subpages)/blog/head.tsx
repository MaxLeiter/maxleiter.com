import { getHeadTags } from "@lib/get-head-tags"

export default function Head() {
  const title = 'Blog'
  const description = 'Posts and tips, mostly about software.'
  return getHeadTags({
    title,
    description,
    path: '/blog',
  })
}
