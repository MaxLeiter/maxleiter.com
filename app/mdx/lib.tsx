import Link from '@components/link'
import { MDXComponents } from 'mdx/types'
import { MDXRemote } from 'next-mdx-remote/rsc'
import NextImage from 'next/image'
import { Code } from 'bright'

function Image({
  src,
  alt,
  height,
  width,
}: {
  src: string
  alt: string
  height: number
  width: number
}) {
  const imageProps = {
    src,
    alt,
    height,
    width,
  }

  return <NextImage {...imageProps} />
}
// This file is required to use MDX in `app` directory.
export const mdxComponents: MDXComponents = {
  a: ({ children, ...props }) => {
    // check if external
    let isExternal = false
    if (props.href?.startsWith('http')) {
      isExternal = true
    }

    return (
      // @ts-expect-error legacy refs
      <Link
        {...props}
        href={props.href || ''}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
      >
        {children}
      </Link>
    )
  },
  // @ts-expect-error RSC
  pre: Code,
  // @ts-expect-error types
  img: Image,
}

import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeImgSize from 'rehype-img-size'

export function PostBody({ body }: { body: string }) {
  return (
    // @ts-expect-error RSC
    <MDXRemote
      source={body}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm, remarkFrontmatter],
          rehypePlugins: [
            rehypeSlug,
            rehypeAutolinkHeadings,
            // @ts-expect-error tuple
            [rehypeImgSize, { dir: 'public' }],
          ],
        },
      }}
      components={mdxComponents}
    />
  )
}
