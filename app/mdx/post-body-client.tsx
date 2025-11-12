'use client'

import { MDXRemote } from 'next-mdx-remote/rsc'

import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
// @ts-expect-error no types
import remarkA11yEmoji from '@fec/remark-a11y-emoji'
import remarkToc from 'remark-toc'
import { mdxComponentsClient } from './components/client'

/**
 * Client-safe version of PostBody for use in client components.
 * Uses client-safe MDX components that don't include server-only dependencies.
 */
export function PostBodyClient({ children }: { children: string }) {
  return (
    <MDXRemote
      source={children}
      options={{
        mdxOptions: {
          remarkPlugins: [
            remarkGfm,
            remarkFrontmatter,
            remarkA11yEmoji,
            [
              remarkToc,
              {
                tight: true,
                maxDepth: 5,
              },
            ],
          ],
          rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
        },
      }}
      components={mdxComponentsClient}
    />
  )
}
