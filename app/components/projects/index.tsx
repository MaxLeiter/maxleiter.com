'use client'

import type { Project } from '@lib/types'
import { Badge } from '@components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card'
import Link from 'next/link'
import { cn } from '@lib/utils'
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@components/ui/hover-card'
import { useState } from 'react'
import Image from 'next/image'
import { Star } from 'lucide-react'

type Props = {
  projects: Project[]
  showYears: boolean
  seeMore: boolean
  cardClassName?: string
  animated?: boolean
}

const Projects = ({
  projects = [],
  seeMore = false,
  showYears = true,
  cardClassName,
  animated = true,
}: Props) => {
  projects.sort((a, b) => {
    if (a.years[0] === b.years[0]) {
      return 0
    }
    return a.years[0] > b.years[0] ? -1 : 1
  })

  const [anyHovercardShown, setAnyHovercardShown] = useState(false)

  return (
    <div
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
            open={project.imageUrl ? undefined : false}
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
                        'flex flex-col text-base',
                        'md:flex-row md:items-center md:gap-3',
                        cardClassName,
                      )}
                    >
                      <span className="text-lg">{project.title}</span>
                      <div className="flex gap-2 mt-2 md:mt-0">
                        {project.stars && (
                          <Badge variant='secondary'>
                            <Star size={14} /> <span style={{ marginLeft: 4 }}>{project.stars}</span>
                          </Badge>
                        )}
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
            <HoverCardContent side="right" className="h-64 rounded-lg w-96">
              {project.imageUrl ? <Image
                src={project.imageUrl || ""}
                alt={""}
                fill={project.imageHeight && project.imageWidth ? false : true}
                height={project.imageHeight || undefined}
                width={project.imageWidth || undefined}
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
    </div>
  )
}

export default Projects
