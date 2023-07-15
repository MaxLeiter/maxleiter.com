import { useState, useEffect } from 'react'

type Feature =
  | 'any-hover'
  | 'any-pointer'
  | 'aspect-ratio'
  | 'color'
  | 'color-gamut'
  | 'color-index'
  | 'device-aspect-ratio'
  | 'device-height'
  | 'device-width'
  | 'display-mode'
  | 'forced-colors'
  | 'grid'
  | 'height'
  | 'hover'
  | 'inverted-colors'
  | 'monochrome'
  | 'orientation'
  | 'overflow-block'
  | 'overflow-inline'
  | 'pointer'
  | 'prefers-color-scheme'
  | 'prefers-contrast'
  | 'prefers-reduced-motion'
  | 'resolution'
  | 'scripting'
  | 'update'
  | 'width'

type Options = {
  feature: Feature
  value: string | number
}

const useMediaQuery = ({ feature, value }: Options) => {
  const [matches, setMatches] = useState(false)

  const query = `(${feature}: ${value})`

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    const listener = () => setMatches(media.matches)
    window.addEventListener('resize', listener)
    return () => window.removeEventListener('resize', listener)
  }, [matches, query])
  return matches
}

const useReducedMotion = () => {
  return useMediaQuery({ feature: 'prefers-reduced-motion', value: 'reduce' })
}

export { useReducedMotion }

export default useMediaQuery
