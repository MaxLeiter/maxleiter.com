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
  return <article>{children}</article>
}
