import type { ReactNode } from 'react'

export default function Layout({ children, header }: { children: ReactNode, header: ReactNode }) {
  return (
    <div className="max-w-6xl px-4 mx-auto sm:px-8 bg-background text-foreground">
      {header}
      {children}
    </div>
  )
}
