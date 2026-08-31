'use client'

import dynamic from 'next/dynamic'

// Client-side split so the tree (and its icons/CSS) only load on posts that
// render <FileTree>.
export const FileTree = dynamic(() => import('./index').then((m) => m.FileTree))
export const Folder = dynamic(() => import('./index').then((m) => m.Folder))
export const File = dynamic(() => import('./index').then((m) => m.File))
