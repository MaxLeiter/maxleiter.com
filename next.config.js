const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
})

module.exports = withMDX({
  // swcMinify: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  pageExtensions: ['js', 'ts', 'tsx', 'md', 'mdx'],
  async redirects() {
    return [
      {
        source: '/X11',
        destination: '/blog/X11',
        permanent: true,
      },
    ]
  },
})
