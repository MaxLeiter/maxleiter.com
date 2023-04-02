export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
      },
    ],
    sitemap: 'https://maxleiter.com/sitemap.xml',
    host: 'https://maxleiter.com',
  }
}
