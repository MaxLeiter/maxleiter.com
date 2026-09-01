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

/**
 * The island names rendered since the last call, clearing them for the next
 * page. `entry-server.ts` calls it once to discard anything a previous run
 * left behind, then once per rendered document.
 */
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
