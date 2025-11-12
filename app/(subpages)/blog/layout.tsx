export const metadata = {
  title: 'Blog',
  description: 'My blog posts',
  alternates: {
    canonical: 'https://maxleiter.com/blog',
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
