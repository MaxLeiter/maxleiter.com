import type { ReactNode } from 'react'

export default function Layout({ children, header }: { children: ReactNode, header: ReactNode }) {
  return (
    <div className="mx-auto bg-background text-foreground max-w-[min(1000px,100vw)] px-8 md:px-0">
      {header}
      {children}
    </div>
  )
}
