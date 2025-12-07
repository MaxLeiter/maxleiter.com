'use client'

import { useEffect } from 'react'
import { CommandPalette } from '@components/desktop/command-palette'
import { useRouter } from 'next/navigation'
import type { BlogPost, Project } from '@lib/portfolio-data'
import { useEffects } from '@components/desktop/effects-context'

interface GlobalKeyboardHandlerProps {
  blogPosts: BlogPost[]
  projects: Project[]
}

export function GlobalKeyboardHandler({
  blogPosts,
  projects,
}: GlobalKeyboardHandlerProps) {
  const { showCommandPalette, setShowCommandPalette } = useEffects()
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setShowCommandPalette])

  if (!showCommandPalette) return null

  return (
    <CommandPalette
      blogPosts={blogPosts}
      projects={projects}
      onClose={() => setShowCommandPalette(false)}
      onNavigate={(path, external) =>
        external
          ? window.open(path, '_blank', 'noopener noreferrer')
          : router.push(path)
      }
    />
  )
}
