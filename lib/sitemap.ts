import fs from 'fs'
import globby from 'globby'
import prettier from 'prettier'
import path from "path"
import getPosts from "./get-posts"
const getDate = new Date().toISOString()

const DOMAIN = process.env.NEXT_PUBLIC_VERCEL_URL || "https://maxleiter.com"

const formatted = (sitemap: string) => prettier.format(sitemap, { parser: 'html' });

(async () => {
  const pages = await globby([
    // include
    'pages/*.tsx',
    // exclude
    '!pages/_*.tsx',
  ])
  console.log(pages)

  const blogPosts = getPosts()
  for (const post of blogPosts) {
    if (post)
      pages.push(`posts/${post.slug}.tsx`)
  }

  const pagesSitemap = `
    ${pages
      .map((page) => {
        const path = page
          .replace('../pages/', '')
          .replace('.tsx', '')
          .replace(/\/index/g, '')
        const routePath = path === 'index' ? '' : path
        return `
          <url>
            <loc>${DOMAIN}/${routePath}</loc>
            <lastmod>${getDate}</lastmod>
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
