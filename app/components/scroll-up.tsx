// this is only necessary while https://github.com/vercel/next.js/issues/42492 remains open
'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function ScrollUp() {
  const path = usePathname()
  useEffect(() => window.document.scrollingElement?.scrollTo(0, 0), [path])
  return null
}
