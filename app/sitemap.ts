import { getPosts } from './lib/get-posts'

export default async function sitemap() {
  const posts = await getPosts()
  const blogs = posts.map((post) => ({
    url: `https://maxleiter.com/blog/${post.slug}`,
    lastModified: post.lastModified
      ? new Date(post.lastModified).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  }))

  const routes = ['', '/about', '/projects', '/ie-or-css3', '/talks'].map(
    (route) => ({
      url: `https://maxleiter.com${route}`,
      lastModified: new Date().toISOString().split('T')[0],
    })
  )

  return [...routes, ...blogs]
}
