"use client"

import { GitHub, Twitter, Mail, RSS } from "@components/icons"
import Link from "@components/link"
import styles from "./hero.module.css"

export function Hero() {
  return (
    <section className={styles.hero}>
      {/* Futuristic grid background */}
      <div className={styles.gridBackground}>
        <div className={styles.grid} />
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.content}>
          <h1 className={styles.name}>
            Max Leiter
          </h1>

          <div className={styles.description}>
            <p>
              I&apos;m currently building{" "}
              <Link
                href="https://v0.app"
                external
                className={styles.v0Link}
              >
                v0
              </Link>{" "}
              at{" "}
              <Link
                href="https://vercel.com"
                external
                className={styles.link}
              >
                Vercel
              </Link>
              . I&apos;m interested in politics, tech, and building a fast, accessible web.
            </p>
          </div>

          <div className={styles.socials}>
            <Link
              href="https://github.com/maxleiter"
              external
              className={styles.socialLink}
              aria-label="GitHub"
            >
              <GitHub strokeWidth={2} />
            </Link>
            <Link
              href="https://twitter.com/max_leiter"
              external
              className={styles.socialLink}
              aria-label="Twitter"
            >
              <Twitter strokeWidth={2} />
            </Link>
            <Link
              href="mailto:maxwell.leiter@gmail.com"
              className={styles.socialLink}
              aria-label="Email"
            >
              <Mail strokeWidth={2} />
            </Link>
            <Link
              href="/feed.xml"
              className={styles.socialLink}
              aria-label="RSS Feed"
            >
              <RSS strokeWidth={2} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
