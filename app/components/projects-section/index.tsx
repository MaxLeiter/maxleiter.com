import { getProjects } from "@lib/projects"
import Link from "next/link"
import { Star } from "@components/icons"
import styles from "./projects-section.module.css"


export async function ProjectsSection() {
  const projects = await getProjects()
  const featuredProjects = projects.slice(0, 3)

  return (
    <section className={styles.section}>
      <div className={styles.contentWrapper}>
        <div className={styles.container}>
          <h2 className={styles.title}>My projects</h2>

          <div className={styles.projectsGrid}>
          {featuredProjects.map((project) => {
            const isExternal = project.href?.startsWith("http")
            const linkProps = isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {}

            return (
              <Link
                key={project.title}
                href={project.href || "#"}
                {...linkProps}
                className={styles.projectLink}
              >
                <article className={styles.project}>
                  <div className={styles.projectHeader}>
                    <div className={styles.titleRow}>
                      <h3 className={styles.projectTitle}>{project.title}</h3>
                      <div className={styles.projectMeta}>
                        <span className={styles.role}>{project.role}</span>
                        {project.stars && (
                          <span className={styles.stars} aria-label={`${project.stars.toLocaleString()} GitHub stars`}>
                            <Star width={12} height={12} aria-hidden="true" />
                            {project.stars.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg
                      className={styles.arrow}
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="7" y1="17" x2="17" y2="7"></line>
                      <polyline points="7 7 17 7 17 17"></polyline>
                    </svg>
                  </div>
                  <p className={styles.projectDescription}>{project.description}</p>
                </article>
              </Link>
            )
          })}
        </div>
        <p className={styles.seeMore}>
            See some more on <Link href="/projects">this page</Link>
        </p>

        </div>
      </div>
    </section>
  )
}
