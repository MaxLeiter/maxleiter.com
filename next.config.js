const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
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
    serverComponents: true,
    // Recommended for new `<Link>` and `<Image>` behavior
		// Enables `<Link>` without `<a>`. When migrating an existing app use the codemod as outlined here: https://github.com/vercel/next.js/pull/36436
    newNextLinkBehavior: true,
    // Recommended, will be the default in the next major version:
		// Enable browserslist handling, which is required for legacyBrowsers: false
    browsersListForSwc: true,
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
})
