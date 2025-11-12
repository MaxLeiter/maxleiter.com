import { MDXComponents } from 'mdx/types'
import NextImage from 'next/image'
import Link from '@components/link'
import { MDXNote } from './mdx-note'
import { Code } from 'bright'
import { MDXImage } from './mdx-image'
import Info from '@components/icons/info'
import { FileTree, File, Folder } from '@components/file-tree'
import Home from '@components/icons/home'
import { Tweet } from 'react-tweet'
// import Diff from './mdx-diff'
import dynamic from 'next/dynamic'

const Diff = dynamic(() => import('./mdx-diff'), {
  loading: () => (
    <div
      style={{
        height: 400,
        width: '100%',
        display: 'flex',
        backgroundColor: 'var(--light-gray)',
      }}
    />
  ),
})

// Dynamically import MinecraftInventoryFromDir to avoid bundling 'fs' on client
const MinecraftInventoryFromDir = dynamic(
  () => import('@components/mc').then((mod) => mod.MinecraftInventoryFromDir),
  { ssr: true }
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
  MinecraftInventory: MinecraftInventoryFromDir,
}
