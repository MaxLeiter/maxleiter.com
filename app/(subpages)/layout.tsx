import type { ReactNode } from 'react'

export default function Layout({ children, header }: { children: ReactNode, header: ReactNode }) {
  return (
    <>
      {header}
      {children}
    </>
  )
}
