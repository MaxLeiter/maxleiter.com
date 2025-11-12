import Link from 'next/link'
import { FolderIconDefault } from './desktop-client'

interface ListCardProps {
  href: string
  title: string
  description?: string
  meta?: string
  tags?: string[]
  external?: boolean
  icon?: boolean
  onClick?: (e: React.MouseEvent) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function ListCard({
  href,
  title,
  description,
  meta,
  tags,
  external = false,
  icon,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: ListCardProps) {
  const Component = external ? 'a' : Link
  const externalProps = external
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {}

  const IconSvg = icon ? (
    <svg
      className="w-4 h-4 text-white/50 mt-0.5 flex-shrink-0 group-hover:text-white/80 transition-colors"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ) : null

  return (
    <Component
      href={href}
      className="block p-3 rounded hover:bg-white/5 transition-colors border border-white/10 group"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...externalProps}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {IconSvg}
            <h2 className="font-mono text-sm font-semibold text-white/90 group-hover:text-white/80 transition-colors">
              {title}
            </h2>
          </div>
          {description && (
            <p className="text-sm text-white/60 mb-2">{description}</p>
          )}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-1.5 py-0.5 text-xs bg-white/5 text-white/70 rounded border border-white/10"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {meta && <p className="text-xs text-white/30 mt-1">{meta}</p>}
        </div>
        {external && (
          <svg
            className="w-3.5 h-3.5 text-white/50 group-hover:text-white/80 transition-colors flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4m-4-4l8-8m0 0H8m8 0v8"
            />
          </svg>
        )}
      </div>
    </Component>
  )
}
