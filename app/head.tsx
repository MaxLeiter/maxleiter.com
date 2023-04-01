import { getMetadata } from '@lib/get-metadata'

export default function Head() {
  const titleAsURLQuery = encodeURIComponent("Max Leiter's Website")
  return getMetadata({
    title: 'Max Leiter',
    description: "Max Leiter's website.",
    path: '/',
    image: `/api/og?title=${titleAsURLQuery}`,
  })
}
