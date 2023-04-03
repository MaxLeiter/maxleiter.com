'use client'

import Box from '@components/icons/box'
import FolderMinus from '@components/icons/folder-minus'
import FolderPlus from '@components/icons/folder-plus'
import FileIcon from '@components/icons/file'
import Layout from '@components/icons/layout'
import React, { PropsWithChildren, useState } from 'react'
import styles from './file-tree.module.css'
import Link from '@components/link'
type FileProps = {
  type: string
  name: string
  note?: string
  url?: string
}

type FolderProps = {
  name: string
  children?: Array<React.ReactElement<FolderProps | FileProps>>
  open?: boolean
  note?: string
}

type FileTreeProps = {
  children: React.ReactNode | Array<React.ReactNode>
}

const Folder: React.FC<FolderProps> = ({ name, children, open, note }) => {
  const [isOpen, setIsOpen] = useState(open)

  const handleClick = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div>
      <a onClick={handleClick}>
        <div className={styles.folder}>
          {isOpen ? (
            <FolderMinus color="var(--fg)" fill="none" />
          ) : (
            <FolderPlus color="var(--fg)" fill="none" />
          )}
          <span>
            {name}
            <span className={styles.note}>{note}</span>
          </span>
        </div>
      </a>
      {isOpen && (
        <ul className={styles['folder-children']}>
          {Array.isArray(children) ? (
            children.map((child, index) => (
              <React.Fragment key={index}>{child}</React.Fragment>
            ))
          ) : (
            <React.Fragment>{children}</React.Fragment>
          )}
        </ul>
      )}
    </div>
  )
}

const File: React.FC<FileProps> = ({ type, name, note, url: link }) => {
  const Wrapper = ({ children }: PropsWithChildren) => link ? <Link underline={false} href={link} external>{children}</Link> : <>{children}</>
  const withWrapper = (children: React.ReactNode) => <Wrapper>{children}</Wrapper>

  function getIcon() {
    switch (type) {
      case 'layout':
        return <Layout />
      case 'component':
        return <Box />
      case 'page':
        return <FileIcon />
      default:
        return <FileIcon />
    }
  }
  return (
    <li>
      <div className={styles.file}>
        {getIcon()}
        {withWrapper(<span className={styles['file-name']}>
          {name}
          <span className={styles.note}>{note}</span>
        </span>)}
      </div>
    </li>
  )
}

const FileTree: React.FC<FileTreeProps> = ({ children }) => {
  return (
    <div className={styles.wrapper}>
      <ul className={styles.fileTree}>
        {Array.isArray(children)
          ? children.map((child, index) => (
              <React.Fragment key={index}>{child}</React.Fragment>
            ))
          : children}
      </ul>
    </div>
  )
}

export { Folder, File, FileTree }
