import { getHeadTags } from '@lib/get-head-tags'

export default function Head() {
  const titleAsURLQuery = encodeURIComponent("Max Leiter's Website")
  return getHeadTags({
    title: 'Max Leiter',
    description: "Max Leiter's website.",
    path: '/',
    image: `/api/og?title=${titleAsURLQuery}`,
  })
}
