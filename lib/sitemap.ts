import fs from 'fs'
import globby from 'globby'
import prettier from 'prettier'
import path from "path"
import getPosts from "./get-posts"
const getDate = new Date().toISOString()

const DOMAIN = process.env.NEXT_PUBLIC_VERCEL_URL || "https://maxleiter.com"

const formatted = (sitemap: string) => prettier.format(sitemap, { parser: 'html' });
type Page = {
  path: string
  lastmod: string
}

(async () => {
  const pagePaths = await globby([
    // include
    'pages/*.tsx',
    // exclude
    '!pages/_*.tsx',
    '!pages/404.tsx',
  ])

  const pages: Page[] = pagePaths.map((pagePath) => {
    const path = pagePath.replace(/^pages\//, '').replace(/\.tsx$/, '')
    const lastmod = fs.statSync(pagePath).mtime.toISOString()
    return { path, lastmod }
  })

  const blogPosts = getPosts()
  for (const post of blogPosts) {
    if (post)
      pages.push({
        path: `blog/${post.slug}`,
        lastmod: new Date(post.date).toISOString(),
      })
  }

  const pagesSitemap = `
    ${pages
      .map((page) => {
        const path = page.path
          .replace('../pages/', '')
          .replace('.tsx', '')
          .replace(/\/index/g, '')
        const routePath = path === 'index' ? '' : path
        return `
          <url>
            <loc>https://${DOMAIN}/${routePath}</loc>
            <lastmod>${page.lastmod}</lastmod>
          </url>
        `
      })
      .join('')}
  `

  const generatedSitemap = `
    <?xml version="1.0" encoding="UTF-8"?>
    <urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"
    >
      ${pagesSitemap}
    </urlset>
  `

  const formattedSitemap = formatted(generatedSitemap)
  fs.writeFileSync(path.join(__dirname, '../public/sitemap-common.xml'), formattedSitemap, 'utf-8')
})()
