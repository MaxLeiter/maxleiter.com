import Outline from '@components/layout-outline'

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

export const config = { runtime: 'experimental-edge' }
