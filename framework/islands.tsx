import type { ReactNode } from 'react'

/**
 * Build-time island marker.
 *
 * `children` is the server-rendered version of the island, so the page works
 * with JavaScript disabled and the client hydrates over real markup instead of
 * replacing an empty div. The runtime reads `data-on` to decide when to load
 * `app/islands/<name>.tsx`.
 */

export type IslandTrigger = 'load' | 'idle' | 'visible' | 'interaction'

export interface IslandProps {
  name: string
  on?: IslandTrigger
  props?: unknown
  /** Renders the wrapper hidden; the runtime unhides it before mounting. */
  hidden?: boolean
  className?: string
  children: ReactNode
}

const used = new Set<string>()

/** Island names seen during this render pass, for the client bundler. */
export function islandManifest(): string[] {
  return [...used].sort()
}

export function resetIslandManifest(): void {
  used.clear()
}

/** The names rendered since the last reset, clearing them for the next page. */
export function takeIslandManifest(): string[] {
  const names = [...used].sort()
  used.clear()
  return names
}

export function Island({
  name,
  on = 'idle',
  props,
  hidden,
  className,
  children,
}: IslandProps) {
  used.add(name)
  return (
    <div
      data-island={name}
      data-on={on}
      data-props={props === undefined ? undefined : JSON.stringify(props)}
      hidden={hidden}
      className={className}
    >
      {children}
    </div>
  )
}
