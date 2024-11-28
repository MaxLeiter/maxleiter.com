import Outline from '@components/layout-outline'
import '../../styles/markdown.css'

export const metadata = {
  title: 'Dev Notes',
  description: 'Snippets, learnings, and short form thoughts.',
  alternates: {
    canonical: 'https://maxleiter.com/notes',
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <article className='max-w-[min(720px,100vw)]'>
      {children}
    </article>
  )
}
