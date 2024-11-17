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
    <article className='max-w-3xl'>{children}</article>
  )
}
