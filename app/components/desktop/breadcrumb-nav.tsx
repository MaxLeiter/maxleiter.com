import Link from "next/link"

interface BreadcrumbSegment {
  name: string
  href: string
}

export function BreadcrumbNav({ segments }: { segments: BreadcrumbSegment[] }) {
  return (
    <div className="h-10 bg-white/5 border-b border-white/10 flex items-center px-4 gap-2 text-sm font-mono text-white/60">
      <Link href="/" className="hover:text-white/90 transition-colors">
        ~
      </Link>
      {segments.map((segment, index) => (
        <div key={index} className="flex items-center gap-2">
          <span>/</span>
          <Link href={segment.href} className="hover:text-white/90 transition-colors">
            {segment.name}
          </Link>
        </div>
      ))}
    </div>
  )
}
