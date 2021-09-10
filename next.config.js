module.exports = {
  typescript: {
    ignoreDevErrors: true,
  },
  experimental: {
    stats: true,
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
}
