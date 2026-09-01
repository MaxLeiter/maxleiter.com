import type { ReactNode } from 'react'

/**
 * Build-time island marker.
 *
 * `children` is the server-rendered version of the island, so the page works
 * with JavaScript disabled and the client hydrates over real markup instead of
 * replacing an empty div. The runtime reads `data-on` to decide when to load
 * `app/islands/<name>.tsx`.
 */

/**
 * When the runtime mounts an island. Two triggers, because those are the two
 * that are reachable: `interaction` was a third until the only island using it
 * turned out to be rendered `hidden`, where a `pointerdown` or `focusin`
 * listener can never fire, and `idle` was the declared default that no call
 * site ever asked for.
 */
export type IslandTrigger = 'load' | 'visible'

export interface IslandProps {
  name: string
  /**
   * Omit only for an island the runtime mounts by name rather than on a
   * trigger. The command palette is the one: it renders `hidden`, and
   * `openPalette()` in `client/runtime.ts` unhides and mounts it on Cmd/Ctrl+K
   * or a `[data-open-palette]` click. An island with no trigger and no such
   * path never mounts.
   */
  on?: IslandTrigger
  props?: unknown
  /** Renders the wrapper hidden; the runtime unhides it before mounting. */
  hidden?: boolean
  children: ReactNode
}

const used = new Set<string>()

/**
 * The island names rendered since the last call, clearing them for the next
 * page. `render/site.ts` calls it once to discard anything a previous run
 * left behind, then once per rendered document.
 */
export function takeIslandManifest(): string[] {
  const names = [...used].sort()
  used.clear()
  return names
}

export function Island({ name, on, props, hidden, children }: IslandProps) {
  used.add(name)
  return (
    <div
      data-island={name}
      data-on={on}
      data-props={props === undefined ? undefined : JSON.stringify(props)}
      hidden={hidden}
    >
      {children}
    </div>
  )
}
