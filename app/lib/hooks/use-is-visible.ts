import { useRef } from 'react'
import useIntersectionObserver from './use-intersection'

const useIsVisible = (options?: IntersectionObserverInit) => {
  const ref = useRef<HTMLDivElement>(null)
  const entry = useIntersectionObserver(ref, options || { threshold: 0 })
  const isVisible = !!entry?.isIntersecting
  return [ref, isVisible] as const
}

export default useIsVisible
