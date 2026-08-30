'use client'

import { createContext, useContext, useState } from 'react'

interface EffectsContextType {
  showCommandPalette: boolean
  setShowCommandPalette: (show: boolean) => void
}

const EffectsContext = createContext<EffectsContextType | null>(null)

export function useEffects() {
  const context = useContext(EffectsContext)
  if (!context) {
    throw new Error('useEffects must be used within EffectsProvider')
  }
  return context
}

export function EffectsProvider({ children }: { children: React.ReactNode }) {
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  return (
    <EffectsContext.Provider
      value={{
        showCommandPalette,
        setShowCommandPalette,
      }}
    >
      {children}
    </EffectsContext.Provider>
  )
}
