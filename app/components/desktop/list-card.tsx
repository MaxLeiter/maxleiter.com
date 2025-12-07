import Link from 'next/link'
import { ExternalLinkIcon, FolderIconDefault } from './desktop-client'

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
      className="w-4 h-4 text-[var(--gray)] mt-0.5 flex-shrink-0 group-hover:text-[var(--fg)] transition-colors"
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
    <li>
      <Component
        href={href}
        className="block p-3 rounded hover:bg-[var(--lighter-gray)] transition-colors border border-[var(--border-color)] group"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        {...externalProps}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {IconSvg}
              <h2 className="font-mono text-sm font-semibold text-[var(--fg)] group-hover:text-[var(--gray)] transition-colors">
                {title}
              </h2>
            </div>
            {description && (
              <p className="text-sm text-[var(--gray)] mb-2">{description}</p>
            )}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block px-1.5 py-0.5 text-xs bg-[var(--lighter-gray)] text-[var(--gray)] rounded border border-[var(--border-color)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {meta && <p className="text-xs text-[var(--light-gray)] mt-1">{meta}</p>}
          </div>
          {external && <ExternalLinkIcon />}
        </div>
      </Component>
    </li>
  )
}
