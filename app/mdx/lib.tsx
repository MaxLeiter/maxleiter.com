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
  let widthFromSrc, heightFromSrc
  const url = new URL(src, 'https://maxleiter.com')
  const widthParam = url.searchParams.get('w') || url.searchParams.get('width')
  const heightParam =
    url.searchParams.get('h') || url.searchParams.get('height')
  if (widthParam) {
    widthFromSrc = parseInt(widthParam)
  }
  if (heightParam) {
    heightFromSrc = parseInt(heightParam)
  }

  const imageProps = {
    src,
    alt,
    height: height || heightFromSrc || 300,
    width: width || widthFromSrc || 400,
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
  Image: NextImage,
  Details: ({
    children,
    summary,
    ...props
  }: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLDetailsElement
  > & {
    summary: string
  }) => (
    <details {...props}>
      {summary && <summary>{summary}</summary>}
      {children}
    </details>
  ),
}

import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'

export function PostBody({ body }: { body: string }) {
  return (
    // @ts-expect-error RSC
    <MDXRemote
      source={body}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm, remarkFrontmatter],
          rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
        },
      }}
      components={mdxComponents}
    />
  )
}
