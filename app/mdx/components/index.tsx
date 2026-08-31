import { MDXComponents } from 'mdx/types'
import NextImage from 'next/image'
import dynamic from 'next/dynamic'
import Link from '@components/link'
import { MDXNote } from './mdx-note'
import { Code } from 'bright'
import { MDXImage } from './mdx-image'
import Info from '@components/icons/info'
import Home from '@components/icons/home'
import Diff from './mdx-diff-lazy'
import { ShotGrid, Shot } from './shot-grid-lazy'
import { FileTree, File, Folder } from '@components/file-tree/lazy'

// Rarely-used, heavy components are split two ways so posts that don't use
// them pay nothing:
//  - Client Components (Diff, ShotGrid, FileTree) go through a 'use client'
//    wrapper that calls next/dynamic, because a Server Component can't split a
//    Client Component on its own.
//  - Server Components (Tweet, MinecraftInventory) use next/dynamic here; that
//    keeps their CSS and client children out of the base post bundle.

const Tweet = dynamic(() => import('./tweet-block'))
const TweetThread = dynamic(() =>
  import('./tweet-thread').then((m) => m.TweetThread),
)
const MinecraftInventory = dynamic(() =>
  import('@components/mc').then((m) => m.MinecraftInventoryFromDir),
)

Code.theme = {
  dark: 'solarized-dark',
  light: 'material-palenight',
  lightSelector: '[data-theme="light"]',
}

export const mdxComponents: MDXComponents = {
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
  pre: ({
    children,
    ...props
  }: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLPreElement
  >) => {
    return <Code {...props}>{children as any}</Code>
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
    // Necessary due to a hydration error I can't quite figure out
    <details {...props}>
      {summary && <summary>{summary}</summary>}
      {children}
    </details>
  ),
  Note: MDXNote,
  //   icons
  InfoIcon: Info,
  HomeIcon: Home,
  Diff: Diff as any,
  // file tree
  FileTree: FileTree as any,
  File: File as any,
  Folder: Folder as any,
  Tweet,
  TweetThread,
  MinecraftInventory,
  ShotGrid,
  Shot,
}
