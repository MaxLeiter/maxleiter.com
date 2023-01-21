import { getHeadTags } from '@lib/get-head-tags'

export default function Head() {
  const title = 'Talks'
  const description = 'Talks I have enjoyed and want to share.'
  return getHeadTags({
    title,
    description,
    path: '/talks',
  })
}
