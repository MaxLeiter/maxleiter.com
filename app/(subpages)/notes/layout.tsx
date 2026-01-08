import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Notes',
  description: 'Short-form thoughts, code snippets, and tips.',
}

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}