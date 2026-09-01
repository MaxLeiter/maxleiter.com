/** @type {import('next').NextConfig} */
const nextConfig = {
  // Phase 0 (bespoke-framework branch only): the Next 16 canary generates
  // .next/dev/types/validator.ts with 4 TS2559 errors for opengraph-image /
  // robots / sitemap. Not app code. This file is deleted at cutover.
  typescript: { ignoreBuildErrors: true },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'tddeuevmbjbaaeoi.public.blob.vercel-storage.com',
        port: '',
        pathname: '/blog/**',
      },
    ],
  },
  reactStrictMode: true,
  pageExtensions: ['md', 'tsx', 'ts', 'jsx', 'js', 'md', 'mdx'],
  reactCompiler: true,
  experimental: {
    inlineCss: true,
    turbopackRustReactCompiler: true,
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

export default nextConfig
