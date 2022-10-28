import fs from 'fs'
import globby from 'globby'
import path from 'path'
import prettier from 'prettier'

const DOMAIN = 'maxleiter.com'

import getPosts from '../lib/get-posts'

const formatted = (sitemap: string) =>
  prettier.format(sitemap, { parser: 'html' })

;(async () => {
  const pagePaths = await globby([
    // include
    'pages/*.tsx',
    // exclude
    '!pages/_*.tsx',
    '!pages/404.tsx',
  ])

  const pages = pagePaths.map((pagePath) => {
    const path = pagePath.replace(/^pages\//, '').replace(/\.tsx$/, '')
    const lastmod = fs.statSync(pagePath).mtime.toISOString()
    return { path, lastmod }
  })

  const blogPosts = await getPosts()
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
  fs.writeFileSync(
    path.join(__dirname, '../public/sitemap-common.xml'),
    formattedSitemap,
    'utf-8'
  )
})()
