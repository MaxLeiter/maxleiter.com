'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffects } from '@components/desktop/effects-context'

// The palette (and the search index it fetches) only load on first open.
const CommandPalette = dynamic(
  () =>
    import('@components/desktop/command-palette').then((m) => m.CommandPalette),
  { ssr: false },
)

export function GlobalKeyboardHandler() {
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
      onClose={() => setShowCommandPalette(false)}
      onNavigate={(path, external) =>
        external
          ? window.open(path, '_blank', 'noopener noreferrer')
          : router.push(path)
      }
    />
  )
}
