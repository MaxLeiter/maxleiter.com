"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import Header from "@(subpages)/_components/header"
import React from "react"

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
                <React.Fragment key={part}>
                    <span aria-hidden style={{ color: "var(--gray)" }}> / </span>
                    <li style={{ listStyle: "none" }}>
                        <Link key={part} href={href}>
                            {part}
                        </Link>
                    </li>
                </React.Fragment>
            )
        })]
    }, [pathname])

    if (pathname === "/") return null

    return (
        <nav>
            <Header>
                <ol className="flex items-center gap-1 list-none text-muted-foreground">
                    {breadcrumbs}
                </ol>
            </Header>
        </nav>
    )
}