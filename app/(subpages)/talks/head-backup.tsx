import { getMetadata } from '@lib/get-metadata'

export default function Head() {
  const title = 'Talks'
  const description = 'Talks I have enjoyed and want to share.'
  return getMetadata({
    title,
    description,
    path: '/talks',
  })
}
