import Header from './_components/header'
import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header render={true} title={''} />
      {children}
    </>
  )
}
