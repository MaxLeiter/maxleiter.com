module.exports = {
  swcMinify: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  reactStrictMode: true,

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
