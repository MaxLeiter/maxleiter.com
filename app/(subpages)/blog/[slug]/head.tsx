import { getHeadTags } from '@lib/get-head-tags'
import { getPost } from '@lib/get-posts'

export default async function Head({
  params,
}: {
  params: {
    slug: string
  }
}) {
  const { slug } = params
  const post = await getPost(slug)
  if (!post) {
    return null
  }
  const { title, date, description } = post
  return getHeadTags({
    title,
    description,
    path: `/blog/${slug}`,
    date,
    image: `/api/og?title=${encodeURIComponent(
      title
    )}&date=${encodeURIComponent(
      new Date(date)
        .toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
    )}`,
  })
}
