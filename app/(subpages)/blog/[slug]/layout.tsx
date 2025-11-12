import getPosts from '@lib/get-posts'
import { Metadata } from 'next'
import { JSX } from 'react'

export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export const generateMetadata = async (props: {
  params: Promise<{
    slug: string
  }>
}): Promise<Metadata> => {
  const params = await props.params
  const post = (await getPosts()).find((p) => p?.slug === params.slug)
  return {
    title: post?.title,
    description: post?.description,
    alternates: {
      canonical: `https://maxleiter.com/blog/${params.slug}`,
    },
  }
}

export default async function PostLayout(props: {
  children: JSX.Element
  params: Promise<{
    slug: string
  }>
}) {
  const { children } = props

  return <>{children}</>
}
