import withBundleAnalyzer from '@next/bundle-analyzer'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    localPatterns: [
      {
        pathname: '/blog/**',
      },
    ],
  },
  reactStrictMode: true,
  pageExtensions: ['md', 'tsx', 'ts', 'jsx', 'js', 'md', 'mdx'],
  experimental: {
    mdxRs: true,
    viewTransition: true,
  },
  typescript: {
    ignoreBuildErrors: true,
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

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig)
