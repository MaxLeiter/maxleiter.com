import '../../styles/markdown.css'
export const metadata = {
  title: 'Blog',
  description: 'Posts and tips, mostly about software.',
  alternates: {
    canonical: 'https://maxleiter.com/blog',
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <article>{children}</article>
  )
}
