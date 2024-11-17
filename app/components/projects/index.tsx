"use client"

import type { Project } from '@lib/types'
import { motion } from 'framer-motion'
import { Badge } from '@components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card'
import Link from 'next/link'
import { cn } from '@lib/utils'

type Props = {
  projects: Project[]
  showYears: boolean
  seeMore: boolean;
  cardClassName?: string;
}

const Projects = ({ projects = [], seeMore = false, showYears = true, cardClassName }: Props) => {
  projects.sort((a, b) => parseInt(b.years[0]) - parseInt(a.years[0]))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col gap-4"
    >
      <h2 className="text-2xl font-semibold tracking-tight">Projects</h2>
      <div className="flex flex-col gap-3">
        {projects.map((project) => (
          <Link key={project.title} href={project.href} target="_blank" rel="noopener noreferrer">
            <Card className="transition-colors hover:bg-muted bg-card border-border">
              <CardHeader className="p-5">
                <CardTitle className={cn("flex items-center gap-3 text-base", cardClassName)}>
                  <span className="text-lg">{project.title}</span>
                  <div className="flex gap-2">
                    <Badge>{project.role}</Badge>
                    {showYears && (
                      <Badge>
                        {project.years[0]} {project.years[1] ? '-' : ''} {project.years[1]}
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {seeMore && (
          <p className='pt-4 ml-1'>
            See some more on <Link href="/projects"> this page</Link>
          </p>
        )}
      </div>
    </motion.div>
  )
}

export default Projects
