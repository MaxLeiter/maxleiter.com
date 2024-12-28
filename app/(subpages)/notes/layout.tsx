import Outline from '@components/layout-outline'

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
    <Outline type="layout" name="Blog">
      <article>{children}</article>
    </Outline>
  )
}
