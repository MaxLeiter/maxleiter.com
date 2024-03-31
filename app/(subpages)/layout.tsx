import Header from './_components/header'
import type { ReactNode } from 'react'

export default function Layout({ children, breadcrumbs }: { children: ReactNode, breadcrumbs: ReactNode }) {
  return (
    <>
      <Header render={true} title={breadcrumbs} />
      {children}
    </>
  )
}
