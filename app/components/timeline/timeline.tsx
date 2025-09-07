"use client"

import Badge from "@components/badge"
import styles from "./timeline.module.css"
import Star from "@components/icons/star"
import type { Project } from "@lib/types"

interface TimelineVariation3Props {
    projects: Project[]
}


const currYear = new Date().getFullYear()

export function ProjectsTimeline({ projects }: TimelineVariation3Props) {
    const projectsWithSpans = projects.map((project, index) => {
        const hasSpan = project.years.length > 1
        const startYear = Number.parseInt(project.years[0])
        const maybeEndYearString = project.years[project.years.length - 1]
        const endYear = hasSpan ? maybeEndYearString.toLowerCase() === 'present' ? 'Now' : Number.parseInt(maybeEndYearString) : startYear
        const spanYears = endYear - startYear + 1

        return {
            ...project,
            hasSpan,
            startYear,
            endYear,
            spanYears,
            index,
        }
    })

    return (
        <div className={styles.container}>
            <div className={styles.timeline}>
                <div className={styles.verticalLine}></div>

                {/*projectsWithSpans.map(
                    (project) =>
                        project.hasSpan && (
                            <div
                                key={`span-${project.id}`}
                                className={styles.spanLine}
                                style={{
                                    top: `${project.index * 6}rem`,
                                    height: `${Math.max(project.spanYears * 0.8, 2)}rem`,
                                    left: `${4.5 + (project.index % 3) * 0.3}rem`,
                                }}
                            />
                        ),
                )*/}

                <div className={styles.projectList}>
                    {projectsWithSpans.map((project) => (
                        <div key={project.title} className={styles.projectItem}>
                            <div className={styles.content}>
                                <div className={styles.header}>
                                    <div className={styles.headerGrid}>
                                        <div className={styles.year}>
                                            {project.hasSpan ? `${project.startYear}-${project.endYear}` : project.years[0]}
                                        </div>
                                        <div className={styles.titleContainer}>
                                            <h3 className={project.description ? styles.titleBig : styles.titleSmall}>
                                                {project.href ? (
                                                    <a href={project.href} className={styles.titleLink} target="_blank" rel="noopener noreferrer">
                                                        {project.title}
                                                    </a>
                                                ) : (
                                                    project.title
                                                )}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className={styles.badges}>
                                        {project.role && <Badge>{project.role}</Badge>}
                                        {project.stars !== undefined && (
                                            <a href={project.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                                <Badge className={styles.starBadge}>
                                                    <Star size={14} />
                                                    {project.stars}
                                                </Badge>
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {project.description && <p className={styles.description}>{project.description}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
