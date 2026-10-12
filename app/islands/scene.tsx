import { useEffect, useRef } from 'react'

/**
 * The homepage's 3D backdrop: the ring, the gas giant and the star field.
 *
 * The island itself is a host element and an effect. The renderer, its three
 * backends and ~45 KB of shader source are a second, lazy import, so they
 * load after the island mounts -- itself after first paint -- and never on
 * any other page. Until the first frame lands, the painted sky the page
 * already shows is the backdrop, so nothing on the page waits on the GPU.
 */
export default function Scene() {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = host.current
    if (!el) return
    let stop: (() => void) | undefined
    let disposed = false
    void import('./scene/renderer')
      .then(({ startScene }) => {
        if (!disposed) stop = startScene(el)
      })
      .catch(() => {
        // No scene: the painted sky stays, which is a complete page.
      })
    return () => {
      disposed = true
      stop?.()
    }
  }, [])
  return <div className="mx-scene" ref={host} aria-hidden="true" />
}
