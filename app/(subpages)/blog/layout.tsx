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
    <article className='max-w-3xl'>{children}</article>
  )
}
