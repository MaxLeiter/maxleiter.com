import getPosts from "@lib/get-posts"
import getNotes from "@lib/get-notes"
import Link from "next/link"
import Badge from "@components/badge"
import styles from "./posts-section.module.css"

export async function PostsSection() {
  const [posts, notes] = await Promise.all([
    getPosts(true),
    getNotes(),
  ])

  const content = [...posts, ...notes].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return (
    <section className={styles.section}>
      <div className={styles.contentWrapper}>
        <div className={styles.container}>
          <h2 className={styles.title}>Posts and other half-baked thoughts</h2>

          <div className={styles.postsContainer}>
            {content.map((item, index) => {
            const isPost = item.type === 'post'
            const href = isPost
              ? (item as any).isThirdParty
                ? (item as any).href
                : `/blog/${(item as any).slug}`
              : `/notes/${(item as any).slug}`

            const date = new Date(item.date)
            const formattedDate = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })

            const isThirdParty = isPost && (item as any).isThirdParty

            return (
              <Link key={item.title + item.date} href={href} className={styles.postLink}>
                <article className={styles.post} data-last={index === content.length - 1}>
                  <div className={styles.postMeta}>
                    <time dateTime={item.date}>{formattedDate}</time>
                    <span>/</span>
                    <span>{isPost ? 'Post' : 'Note'}</span>
                  </div>
                  <h3 className={styles.postTitle}>
                    <span>{item.title}</span>
                    {isThirdParty && (
                      <Badge className={styles.vercelBadge}>vercel.com</Badge>
                    )}
                  </h3>
                  {item.description && (
                    <p className={styles.postDescription}>{item.description}</p>
                  )}
                </article>
              </Link>
            )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
