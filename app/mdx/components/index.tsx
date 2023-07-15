import { MDXComponents } from 'mdx/types'
import NextImage from 'next/image'
// import Link from '@components/link'
import { MDXNote } from './mdx-note'
import { Code } from 'bright'
import { MDXImage } from './mdx-image'
import Info from '@components/icons/info'
import { FileTree, File, Folder } from '@components/file-tree'
import Home from '@components/icons/home'
import { Tweet } from 'react-tweet'

export const mdxComponents: MDXComponents = {
  // TODO: re-enable once anchor tags are fixed in the app router
  // a: ({ children, ...props }) => {
  //   // check if external
  //   let te = false
  //   if (props.href?.startsWith('http')) {
  //     isExternal = true
  //   }

  //   return (
  //     // @ts-expect-error legacy refs
  //     <Link
  //       {...props}
  //       href={props.href || ''}
  //       target={isExternal ? '_blank' : undefined}
  //       rel={isExternal ? 'noopener noreferrer' : undefined}
  //     >
  //       {children}
  //     </Link>
  //   )
  // },
  pre: ({
    children,
    ...props
  }: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLPreElement
  >) => {
    // TODO: extract title from children
    return (
      <Code {...props} theme="material-default">
        {children as any}
      </Code>
    )
  },
  // @ts-expect-error types
  img: MDXImage,
  // @ts-expect-error types
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

  // file tree
  // @ts-expect-error types
  FileTree,
  // @ts-expect-error types
  File,
  // @ts-expect-error types
  Folder,

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
}
