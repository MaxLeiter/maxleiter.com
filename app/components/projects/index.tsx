'use client'

import type { Project } from '@lib/types'
import { motion } from 'framer-motion'
import { Badge } from '@components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card'
import Link from 'next/link'
import { cn } from '@lib/utils'
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@components/ui/hover-card'
import { useEffect, useState } from 'react'
import Image from 'next/image'

type Props = {
  projects: Project[]
  showYears: boolean
  seeMore: boolean
  cardClassName?: string
}

const Projects = ({
  projects = [],
  seeMore = false,
  showYears = true,
  cardClassName,
}: Props) => {
  projects.sort((a, b) => {
    if (a.years[0] === b.years[0]) {
      return 0
    }
    return a.years[0] > b.years[0] ? -1 : 1
  })

  const [anyHovercardShown, setAnyHovercardShown] = useState(false)

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
          <HoverCard
            openDelay={anyHovercardShown ? 0 : 100}
            closeDelay={100}
            key={project.title}
            onOpenChange={(open) => setAnyHovercardShown(open)}
          >
            <HoverCardTrigger asChild>
              <Link
                key={project.title}
                href={project.href || ''}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Card className="transition-colors hover:bg-muted bg-card border-border">
                  <CardHeader className="p-5">
                    <CardTitle
                      className={cn(
                        'flex items-center gap-3 text-base',
                        cardClassName,
                      )}
                    >
                      <span className="text-lg">{project.title}</span>
                      <div className="flex gap-2">
                        <Badge>{project.role}</Badge>
                        {showYears && (
                          <Badge>
                            {project.years[0]} {project.years[1] ? '-' : ''}{' '}
                            {project.years[1]}
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <p className="text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </HoverCardTrigger>
            <HoverCardContent side="right">
              {project.imageUrl ? <Image
                src={project.imageUrl || ""}
                alt={""}
                width={400}
                height={300}
                layout="responsive"
                className="rounded-lg"
              /> : null}
            </HoverCardContent>
          </HoverCard>
        ))}
        {seeMore && (
          <p className="pt-4 ml-1">
            See some more on <Link href="/projects"> this page</Link>
          </p>
        )}
      </div>
    </motion.div>
  )
}

export default Projects
