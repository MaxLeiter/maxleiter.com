import Badge from '@components/badge'
import Button from '@components/button'
import { GitHub } from '@components/icons'
import Link from '@components/link'
import styles from './page.module.css'
import * as FileTree from '@components/file-tree'
import { Entry } from '@components/entry'
import BlockEntry from '@components/entry/block'
import Tooltip from '@components/tooltip'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Components',
  description: 'A collection of components on this website.',
  robots: {
    index: false,
  },
}

export default function ComponentsPage() {
  return (
    <section className={styles.wrapper}>
      <h1>Components</h1>
      <p>
        This page is a collection of components on this website. I use many of
        them in my other projects as well. Feel free to take what you need.
      </p>
      <ExampleWrapper>
        <h2>Button</h2>
        <Button width={100}>Click me</Button>
        <Button loading width={100}>
          Click me
        </Button>
        <Button disabled width={100}>
          Click me
        </Button>
      </ExampleWrapper>
      <ExampleWrapper>
        <h2>Icon</h2>
        <p>
          {' '}
          SVG Icons largely from{' '}
          <Link href="https://feathericons.com/">Feather Icons</Link>{' '}
        </p>
        <GitHub /> <GitHub size={40} /> <GitHub strokeWidth={3} />
      </ExampleWrapper>
      <ExampleWrapper>
        <h2>Link</h2>

        <Link href="">A Link</Link>
        <Link href="" underline={false}>
          No underline
        </Link>
      </ExampleWrapper>
      <ExampleWrapper>
        <h2>Badge</h2>
        <Badge width={75}>A badge</Badge>
      </ExampleWrapper>
      <ExampleWrapper>
        <h2>File tree</h2>
        <FileTree.FileTree>
          <FileTree.Folder name="src" open>
            <FileTree.File name="page.tsx" type="page" />
            <FileTree.File name="layout.tsx" type="layout" />
            <FileTree.Folder name="components" open>
              <FileTree.File name="button.tsx" type="component" note="A note" />
              <FileTree.File name="icon.tsx" type="component" />
            </FileTree.Folder>
          </FileTree.Folder>
        </FileTree.FileTree>
      </ExampleWrapper>
      <ExampleWrapper>
        <h2>Entries</h2>
        <h3>Regular</h3>
        <ul style={{ listStyle: 'none', margin: 0 }}>
          <Entry
            description="Description"
            role="Role"
            title="Title"
            href=""
            years={['2023']}
            showYears
          />
        </ul>
        <h3>Block</h3>
        <ul style={{ listStyle: 'none', margin: 0 }}>
          <BlockEntry
            title="Title"
            href=""
            description="Description"
            date={new Date()}
            views={0}
          />
        </ul>
        <h4>Skeleton</h4>
        <ul style={{ listStyle: 'none', margin: 0 }}>
          <BlockEntry skeleton />
        </ul>
      </ExampleWrapper>
      <ExampleWrapper>
        <h2>Tooltip</h2>
        <Tooltip text="This is a tooltip">Hover me</Tooltip>
      </ExampleWrapper>
    </section>
  )
}

const ExampleWrapper = ({ children }: { children: React.ReactNode }) => (
  <section className={styles.wrapper}>{children}</section>
)
