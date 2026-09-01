import { useState } from 'react'
import Box from '@components/icons/box'
import FileIcon from '@components/icons/file'
import FolderMinus from '@components/icons/folder-minus'
import FolderPlus from '@components/icons/folder-plus'
import LayoutIcon from '@components/icons/layout'

/**
 * The MDX `<FileTree>`, as a hydratable island.
 *
 * Rendered twice from this one file: React renders it at build time inside the
 * `<Island name="file-tree">` fallback, and preact/compat renders it again on
 * screen. Both take the same serializable `tree`, so the fallback and the first
 * client render are identical and hydration patches nothing.
 *
 * The tree arrives as a prop rather than as an import because MDX children are
 * React elements and `data-props` has to be JSON. The class names are literals
 * from app/components/file-tree/file-tree.css, a plain sheet whose scoping is
 * written into the names, so the build and the client agree without a plugin.
 */

export interface FileNode {
  kind: 'file'
  /** `layout` | `component` | `page` | anything else, picks the icon. */
  type: string
  name: string
  note?: string
  url?: string
}

export interface FolderNode {
  kind: 'folder'
  name: string
  note?: string
  open: boolean
  children: TreeNode[]
}

export type TreeNode = FileNode | FolderNode

export interface FileTreeProps {
  tree: TreeNode[]
}

function icon(type: string) {
  switch (type) {
    case 'layout':
      return <LayoutIcon />
    case 'component':
      return <Box />
    default:
      return <FileIcon />
  }
}

function File({ node }: { node: FileNode }) {
  const [focused, setFocused] = useState(false)

  const label = (
    <span className="tree-file-name">
      {node.name}
      <span className="tree-note">{node.note}</span>
    </span>
  )

  return (
    <li
      role="treeitem"
      aria-selected={focused}
      onFocus={(event) => {
        event.currentTarget.classList.add('tree-focused')
        setFocused(true)
      }}
      onBlur={(event) => {
        event.currentTarget.classList.remove('tree-focused')
        setFocused(false)
      }}
    >
      <div className="tree-file" tabIndex={0}>
        {icon(node.type)}
        {node.url ? (
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className="link"
            tabIndex={0}
          >
            <span className="sr-only">{node.type} file:</span>
            {label}
          </a>
        ) : (
          label
        )}
      </div>
    </li>
  )
}

function Folder({ node }: { node: FolderNode }) {
  const [open, setOpen] = useState(node.open)
  const [focused, setFocused] = useState(false)

  return (
    <li
      role="treeitem"
      aria-expanded={open}
      tabIndex={0}
      aria-selected={focused}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          // Tree items nest, and every ancestor folder carries this same
          // handler. Without this, one Enter on a leaf folder collapsed the
          // whole chain above it, which is what the pre-island component did.
          event.stopPropagation()
          setOpen((previous) => !previous)
        }
      }}
    >
      {/* The keyboard path lives on the `<li>`: it is the tree item, it is what
          `tabIndex={0}` makes focusable, and the anchor is explicitly removed
          from the tab order. Duplicating the handler here would toggle twice
          on one keypress, since the event bubbles from the anchor to the li. */}
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events */}
      <a
        onClick={() => setOpen((previous) => !previous)}
        onFocus={(event) => {
          event.currentTarget.classList.add('tree-focused')
          setFocused(true)
        }}
        onBlur={(event) => {
          event.currentTarget.classList.remove('tree-focused')
          setFocused(false)
        }}
        role="button"
        tabIndex={-1}
        aria-label={
          open ? `Collapse ${node.name} folder` : `Expand ${node.name} folder`
        }
      >
        <div className="tree-folder">
          {open ? (
            <FolderMinus color="var(--fg)" fill="none" />
          ) : (
            <FolderPlus color="var(--fg)" fill="none" />
          )}
          <span>
            {node.name}
            <span className="sr-only">, {open ? 'open' : 'closed'} folder</span>
            <span className="tree-note">{node.note}</span>
          </span>
        </div>
      </a>
      {open && (
        <ul className="tree-folder-children" role="group">
          <Nodes nodes={node.children} />
        </ul>
      )}
    </li>
  )
}

function Nodes({ nodes }: { nodes: TreeNode[] }) {
  return (
    <>
      {nodes.map((node, index) =>
        node.kind === 'folder' ? (
          <Folder key={index} node={node} />
        ) : (
          <File key={index} node={node} />
        ),
      )}
    </>
  )
}

export default function FileTree({ tree }: FileTreeProps) {
  return (
    <div className="tree-wrapper">
      <ul className="tree-list" role="tree">
        <Nodes nodes={tree} />
      </ul>
    </div>
  )
}
