import { getHeadTags } from '@lib/get-head-tags'

export default function Head() {
  const title = 'IE or CSS3?'
  const description = 'Test your knowledge on CSS3 and Internet Explorer.'
  return getHeadTags({
    title,
    description,
    path: '/ie-or-css3',
  })
}
