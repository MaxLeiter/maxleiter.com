import { getHeadTags } from '@lib/get-head-tags'

export default function Head() {
  const title = 'Projects'
  const description = 'Most of my projects'
  return getHeadTags({
    title,
    description,
    path: '/projects',
  })
}
