import type { ReactNode } from "react"

interface ContentWindowProps {
  title: string
  children: ReactNode
}

export function ContentWindow({ title, children }: ContentWindowProps) {
  return (
    <div className="min-h-screen bg-black text-white/90 flex flex-col">
      {/* Window Header */}
      <div className="h-10 bg-white/5 border-b border-white/10 flex items-center px-4 text-sm font-mono text-white/80">
        {title}
      </div>

      {/* Window Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl">{children}</div>
      </div>
    </div>
  )
}
