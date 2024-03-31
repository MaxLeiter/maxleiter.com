"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import styles from './styles.module.css'

export default function BreadcrumbPage() {
    const pathname = usePathname()
    const breadcrumbs = useMemo(() => {
        if (!pathname) return

        const homeLink = <li style={{ listStyle: "none" }} key="first"><Link href="/" title="home">~</Link></li>
        const parts = pathname?.split("/").filter(Boolean)
        if (parts?.length === 0) return

        return [homeLink, ...parts.map((part, index) => {
            const href = `/${parts.slice(0, index + 1).join("/")}`
            return (
                <>
                    <span key={`${part}-span`} aria-hidden style={{ color: "var(--gray)" }}> / </span>
                    <li style={{ listStyle: "none" }} key={part}>
                        <Link key={part} href={href}>
                            {part}
                        </Link>
                    </li>
                </>
            )
        })]
    }, [pathname])

    return (
        <nav>
            <ol className={styles.list}>
                {breadcrumbs}
            </ol>
        </nav>
    )
}