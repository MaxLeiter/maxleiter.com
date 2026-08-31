'use client'

import { useTheme } from 'next-themes'
import { isValidElement } from 'react'
import DiffViewer from 'react-diff-viewer'

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
