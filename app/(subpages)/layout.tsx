import Header from '@components/header'
import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header render={true} title={''} />
      {children}
    </>
  )
}

export const config = { runtime: 'experimental-edge' }
