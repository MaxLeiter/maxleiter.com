import { FileTree, Folder, File } from '@components/file-tree'
import { MDXNote } from '@mdx/components/mdx-note'

export default function TestPage() {
  return (
    <article>
      <MDXNote>Test</MDXNote>
      <div>
        <h1>My File Tree</h1>
        <FileTree>
          <Folder name="app">
            <Folder name="components">
              <File type="component" name="button.tsx" />
              <File type="component" name="input.tsx" />
            </Folder>
            <Folder name="(home)">
              <File type="page" name="page.tsx" />
              <File type="layout" name="layout.tsx" />
            </Folder>
            <File type="layout" name="layout.tsx" />
          </Folder>
        </FileTree>
      </div>
    </article>
  )
}
