import Link from "next/link"
import React from "react"
import styles from './footer.module.css'

const PostFooter = () => {
    const ExternalLink = ({ href, children}: { href: string, children: React.ReactNode}) => (
        <Link href={href}><a target="_blank" rel="noopener noreferrer">{children}</a></Link>
    )
    return (
        <footer className={styles.footer}>
            <hr />
            <p>
                Thanks for reading! If you want to see future content, you can follow me <ExternalLink href="https://twitter.com/max_leiter">on Twitter</ExternalLink> or subscribe to my
               <ExternalLink href="/feed.xml"> RSS feed</ExternalLink>.
            </p>
        </footer>
    )
}

export default PostFooter