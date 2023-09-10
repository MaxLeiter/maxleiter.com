'use client'

import { useTheme } from 'next-themes'
import { isValidElement } from 'react'
// import { diffChars } from 'diff'
// import { isValidElement, useState } from 'react'
import DiffViewer from 'react-diff-viewer'
// const TextComparer = ({
//   originalText,
//   transcribedText,
// }: {
//   originalText: string
//   transcribedText: string
// }) => {
//   const diff = diffChars(originalText, transcribedText)
//   const [hovering, setHovering] = useState(false)

//   return (
//     <pre>
//       <code>
//         {diff.map((part, index) => {
//           if (part.removed) {
//             return
//           }

//           const background = part.added ? 'red' : 'green'
//           const indexInOriginal = originalText.indexOf(part.value)
//           return (
//             <span
//               key={index}
//               style={{ background }}
//               onMouseEnter={() => setHovering(true)}
//               onMouseLeave={() => setHovering(false)}
//               onFocus={() => setHovering(true)}
//               onBlur={() => setHovering(false)}
//             >
//               {/* hovered, show the original in its place */}
//               {hovering ? originalText.slice(indexInOriginal, indexInOriginal + part.value.length) : part.value}
//             </span>
//           )
//         })}
//       </code>
//     </pre>
//   )
// }

// export default function TypewriterDiff({ children }: { children: unknown }) {
//   const originalText = `On or about 1788 in a small town of Streliska Galitsia a
// family by the name of Wolf sin Mordecai was living with his
// Wife and three sons ;- Berl, Lippe, and Mordecai.`
//   // children might be a Symbol(react.element) so we need to get its children
//   if (isValidElement(children)) {
//     children = (children.props as any).children
//   }

//   if (typeof children !== 'string') {
//     throw new Error(`children must be a string. Not in: ${children}`)
//   }

//   return (
//     <TextComparer
//       originalText={originalText}
//       transcribedText={children.trim()}
//     />
//   )
// }

const Diff = ({
  originalText,
  transcribedText,
}: {
  originalText: string
  transcribedText: string
}) => {
  const { resolvedTheme } = useTheme()
  return (
    <DiffViewer
      oldValue={originalText}
      newValue={transcribedText}
      hideLineNumbers
      leftTitle={'Original'}
      rightTitle={'Transcribed'}
      useDarkTheme={resolvedTheme === 'dark'}
      styles={{
        wordDiff: 'display: inline;',
        variables: {
          light: {
            wordAddedBackground: 'var(--red)',
            wordRemovedBackground: 'var(--green)',
          },
          dark: {
            wordAddedBackground: 'var(--red)',
            wordRemovedBackground: 'var(--green)',
          },
        },
      }}
      // styles={{
      //   variables: {
      //     light: {
      //       diffViewerBackground: 'var(--lighter-gray)',
      //       diffViewerColor: 'var(--fg)',
      //       diffViewerTitleBackground: 'var(--lighter-gray)',
      //       diffViewerTitleColor: 'var(--fg)',
      //       diffViewerTitleBorderColor: 'var(--lighter-gray)',
      //       addedBackground: 'var(--lightest-gray)',
      //       addedColor: 'var(--fg)',
      //       removedBackground: 'var(--lightest-gray)',
      //       emptyLineBackground: 'var(--lighter-gray)',
      //       removedColor: 'var(--fg)',

      //   },
      // }}
    />
  )
}

export default function TypewriterDiff({ children }: { children: unknown }) {
  const originalText = `On or about 1788 in a small town of Streliska Galitsia a
family by the name of Wolf sin Mordecai was living with his
Wife and three sons ;- Berl, Lippe, and Mordecai.`

  // children might be a react element (due to mdx) so we need to get its children as strings and preserve newlines
  if (isValidElement(children)) {
    children = (children.props as any).children
  }

  if (typeof children !== 'string') {
    children = (children as any)
      .map((child: any) => {
        if (typeof child === 'string') {
          return child
        }
        return child.props.children
      })
      .join('\n')
  }

  if (typeof children !== 'string') {
    throw new Error(`children must be a string. Not in: ${children}`)
  }

  return (
    <Diff
      originalText={originalText}
      transcribedText={(children as string).trim()}
    />
  )
}
