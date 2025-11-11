"use client"

import Link from 'next/link'
import type { Project } from '@lib/portfolio-data'

interface WidgetTopProjectsProps {
  projects: Project[]
  limit?: number
}

export function WidgetTopProjects({ projects, limit = 5 }: WidgetTopProjectsProps) {
  const topProjects = projects.slice(0, limit)

  const formatYears = (years: string[]) => {
    if (years.length === 0) return ''
    if (years.length === 1) return years[0]
    const sorted = years.sort()
    return `${sorted[0]}–${sorted[sorted.length - 1]}`
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-xs font-mono font-semibold text-white/90 uppercase">Top Projects</h2>
      </div>
      <div className="divide-y divide-white/5">
        {topProjects.map((project) => {
          const Component = project.link && project.link !== '#' ? 'a' : 'div'
          const linkProps = project.link && project.link !== '#'
            ? { href: project.link, target: '_blank', rel: 'noopener noreferrer' }
            : {}

          return (
            <Component
              key={project.id}
              className="block px-4 py-3 hover:bg-white/5 transition-colors group"
              {...linkProps}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm font-mono text-white/90 group-hover:text-white/80 transition-colors flex-1">
                  {project.name}
                </h3>
                {project.link && project.link !== '#' && (
                  <svg
                    className="w-3.5 h-3.5 text-white/50 group-hover:text-white/80 transition-colors shrink-0"
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
              <p className="text-xs text-white/50 mb-2">{project.description}</p>
              {project.tech && project.tech.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {project.tech.map((tech) => (
                    <span
                      key={tech}
                      className="inline-block px-1.5 py-0.5 text-xs bg-white/5 text-white/70 rounded border border-white/10"
                    >
                      {formatYears(project.tech) === tech ? formatYears(project.tech) : tech}
                    </span>
                  ))}
                </div>
              )}
            </Component>
          )
        })}
      </div>
      <Link
        href="/projects"
        className="block px-4 py-2 text-center text-xs font-mono text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors border-t border-white/10"
      >
        View all projects →
      </Link>
    </div>
  )
}
