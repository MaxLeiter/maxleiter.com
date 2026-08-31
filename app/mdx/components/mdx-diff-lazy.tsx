'use client'

import dynamic from 'next/dynamic'

// react-diff-viewer drags in emotion (~48KB). A Server Component can't
// code-split a Client Component (even through next/dynamic), so the split has
// to happen from inside a Client Component: this wrapper is what the MDX map
// references, and the real implementation only downloads on posts that render
// <Diff>.
const Diff = dynamic(() => import('./mdx-diff'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 400,
        width: '100%',
        display: 'flex',
        backgroundColor: 'var(--light-gray)',
      }}
    />
  ),
})

export default Diff
