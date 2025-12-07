'use client'

import Link from 'next/link'
import type { Project } from '@lib/portfolio-data'

interface WidgetTopProjectsProps {
  projects: Project[]
  limit?: number
}

function ExternalLinkIcon() {
  return (
    <svg
      height="14"
      width="14"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      className="text-[var(--gray)] group-hover:text-[var(--fg)] transition-colors"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.5 10.25V13.25C13.5 13.3881 13.3881 13.5 13.25 13.5H2.75C2.61193 13.5 2.5 13.3881 2.5 13.25L2.5 2.75C2.5 2.61193 2.61193 2.5 2.75 2.5H5.75H6.5V1H5.75H2.75C1.7835 1 1 1.7835 1 2.75V13.25C1 14.2165 1.7835 15 2.75 15H13.25C14.2165 15 15 14.2165 15 13.25V10.25V9.5H13.5V10.25ZM9 1H9.75H14.2495C14.6637 1 14.9995 1.33579 14.9995 1.75V6.25V7H13.4995V6.25V3.56066L8.53033 8.52978L8 9.06011L6.93934 7.99945L7.46967 7.46912L12.4388 2.5H9.75H9V1Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function WidgetTopProjects({
  projects,
  limit = 5,
}: WidgetTopProjectsProps) {
  const topProjects = projects.slice(0, limit)

  const formatYears = (years: string[]) => {
    if (years.length === 0) return ''
    if (years.length === 1) return years[0]
    const sorted = years.sort()
    return `${sorted[0]}–${sorted[sorted.length - 1]}`
  }

  return (
    <div className="bg-[var(--lightest-gray)] border border-[var(--border-color)] rounded-lg overflow-hidden">
      <div className="border-b border-[var(--border-color)] px-4 3xl:px-5 py-3 3xl:py-4">
        <h2 className="text-xs 3xl:text-sm font-mono font-semibold text-[var(--fg)] uppercase">
          Top Projects
        </h2>
      </div>
      <ul className="divide-y divide-[var(--lighter-gray)]">
        {topProjects.map((project) => {
          const Component = project.link && project.link !== '#' ? 'a' : 'div'
          const linkProps =
            project.link && project.link !== '#'
              ? {
                  href: project.link,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                }
              : {}

          return (
            <li key={project.id}>
              <Component
                className="block px-4 3xl:px-5 py-3 3xl:py-4 hover:bg-[var(--lighter-gray)] transition-colors group"
                {...linkProps}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm 3xl:text-base font-mono text-[var(--fg)] group-hover:text-[var(--gray)] transition-colors flex-1">
                    {project.name}
                  </h3>
                  {project.link && project.link !== '#' && <ExternalLinkIcon />}
                </div>
                <p className="text-xs 3xl:text-sm text-[var(--gray)] mb-2">
                  {project.description}
                </p>
                {project.tech && project.tech.length > 0 && (
                  <div className="flex flex-wrap gap-1 3xl:gap-1.5">
                    {project.tech.map((tech) => (
                      <span
                        key={tech}
                        className="inline-block px-1.5 3xl:px-2 py-0.5 3xl:py-1 text-xs 3xl:text-sm bg-[var(--lighter-gray)] text-[var(--gray)] rounded border border-[var(--border-color)]"
                      >
                        {formatYears(project.tech) === tech
                          ? formatYears(project.tech)
                          : tech}
                      </span>
                    ))}
                  </div>
                )}
              </Component>
            </li>
          )
        })}
      </ul>
      <Link
        href="/projects"
        className="block px-4 3xl:px-5 py-2 3xl:py-3 text-center text-xs 3xl:text-sm font-mono text-[var(--gray)] hover:text-[var(--fg)] hover:bg-[var(--lighter-gray)] transition-colors border-t border-[var(--border-color)]"
      >
        View all projects →
      </Link>
    </div>
  )
}
