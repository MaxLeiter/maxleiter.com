// const withBundleAnalyzer = require('@next/bundle-analyzer')({
//   enabled: process.env.ANALYZE === 'true',
// })
/** @type {import('next').NextConfig} */
module.exports = {
  swcMinify: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    domains: ['i.ytimg.com'],
  },
  reactStrictMode: true,
  pageExtensions: ['md', 'tsx', 'ts', 'jsx', 'js'],
  experimental: {
    // Required:
    appDir: true,
    // Change the default compilation output to ESModules compatible browsers
    legacyBrowsers: false,
    optimizeCss: true,
  },
  async redirects() {
    return [
      {
        source: '/X11',
        destination: '/blog/X11',
        permanent: true,
      },
      {
        source: '/atom',
        destination: '/feed.xml',
        permanent: true,
      },
      {
        source: '/feed',
        destination: '/feed.xml',
        permanent: true,
      },
      {
        source: '/rss',
        destination: '/feed.xml',
        permanent: true,
      },
    ]
  },
}
