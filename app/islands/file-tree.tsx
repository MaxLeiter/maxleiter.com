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
 * Two things arrive as props rather than as imports. The tree, because MDX
 * children are React elements and `data-props` has to be JSON. The class names,
 * because the CSS modules are compiled by framework/css.ts with lightningcss
 * and the client bundle has no equivalent plugin: importing the stylesheet here
 * would mint a second, different set of scoped names.
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

/** Scoped class names, resolved on the server from the CSS module. */
export interface FileTreeClasses {
  wrapper: string
  fileTree: string
  file: string
  folder: string
  folderChildren: string
  fileName: string
  note: string
  focused: string
  /** `link.module.css`'s `.link`, for the external-file anchors. */
  link: string
}

export interface FileTreeProps {
  tree: TreeNode[]
  classes: FileTreeClasses
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

function File({ node, classes }: { node: FileNode; classes: FileTreeClasses }) {
  const [focused, setFocused] = useState(false)

  const label = (
    <span className={classes.fileName}>
      {node.name}
      <span className={classes.note}>{node.note}</span>
    </span>
  )

  return (
    <li
      role="treeitem"
      aria-selected={focused}
      onFocus={(event) => {
        event.currentTarget.classList.add(classes.focused)
        setFocused(true)
      }}
      onBlur={(event) => {
        event.currentTarget.classList.remove(classes.focused)
        setFocused(false)
      }}
    >
      <div className={classes.file} tabIndex={0}>
        {icon(node.type)}
        {node.url ? (
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className={classes.link}
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

function Folder({
  node,
  classes,
}: {
  node: FolderNode
  classes: FileTreeClasses
}) {
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
          event.currentTarget.classList.add(classes.focused)
          setFocused(true)
        }}
        onBlur={(event) => {
          event.currentTarget.classList.remove(classes.focused)
          setFocused(false)
        }}
        role="button"
        tabIndex={-1}
        aria-label={
          open ? `Collapse ${node.name} folder` : `Expand ${node.name} folder`
        }
      >
        <div className={classes.folder}>
          {open ? (
            <FolderMinus color="var(--fg)" fill="none" />
          ) : (
            <FolderPlus color="var(--fg)" fill="none" />
          )}
          <span>
            {node.name}
            <span className="sr-only">, {open ? 'open' : 'closed'} folder</span>
            <span className={classes.note}>{node.note}</span>
          </span>
        </div>
      </a>
      {open && (
        <ul className={classes.folderChildren} role="group">
          <Nodes nodes={node.children} classes={classes} />
        </ul>
      )}
    </li>
  )
}

function Nodes({
  nodes,
  classes,
}: {
  nodes: TreeNode[]
  classes: FileTreeClasses
}) {
  return (
    <>
      {nodes.map((node, index) =>
        node.kind === 'folder' ? (
          <Folder key={index} node={node} classes={classes} />
        ) : (
          <File key={index} node={node} classes={classes} />
        ),
      )}
    </>
  )
}

export default function FileTree({ tree, classes }: FileTreeProps) {
  return (
    <div className={classes.wrapper}>
      <ul className={classes.fileTree} role="tree">
        <Nodes nodes={tree} classes={classes} />
      </ul>
    </div>
  )
}
