const fs = require('fs');

module.exports = {
  typescript: {
    ignoreDevErrors: true
  },
  experimental: {
    stats: true,
  },
  future: {
    webpack5: true,
  },
  async redirects() {
    return [
      {
        source: '/X11',
        destination: '/blog/X11',
        permanent: true,
      },
    ]
  },
  env: {
    NEXT_PUBLIC_rawAnalyticsFromFile: fs.readFileSync('./lib/analytics.js').toString()
  }
}
