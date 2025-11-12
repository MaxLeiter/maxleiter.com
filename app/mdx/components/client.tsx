'use client'

import { MDXComponents } from 'mdx/types'
import NextImage from 'next/image'
import Link from '@components/link'
import { MDXNote } from './mdx-note'
import { MDXImage } from './mdx-image'
import Info from '@components/icons/info'
import { FileTree, File, Folder } from '@components/file-tree'
import Home from '@components/icons/home'
import { Tweet } from 'react-tweet'

/**
 * Client-safe MDX components for use in client components like blog post previews.
 * Excludes server-only components like MinecraftInventoryFromDir and Code (Bright).
 */
export const mdxComponentsClient: MDXComponents = {
  a: ({ children, ...props }) => {
    let isExternal = false
    if (props.href?.startsWith('http')) {
      isExternal = true
    }

    return (
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
  // Use simple pre/code for client-side rendering instead of Bright
  pre: ({ children, ...props }: any) => {
    return <pre {...props}>{children}</pre>
  },
  code: ({ children, ...props }: any) => {
    return <code {...props}>{children}</code>
  },
  img: MDXImage as any,
  Image: NextImage as any,
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
  Note: MDXNote,
  //   icons
  InfoIcon: Info,
  HomeIcon: Home,
  // file tree
  FileTree: FileTree as any,
  File: File as any,
  Folder: Folder as any,

  Tweet: (props) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Tweet {...props} />
    </div>
  ),
  // MinecraftInventory and Diff are excluded for client-side use
}
