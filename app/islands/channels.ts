/**
 * The homepage's 3D channel room, as a vanilla island.
 *
 * The server-rendered dashboard is already a complete page of links, so there
 * is nothing to hydrate and this ships without preact: the default export is
 * the mount function the runtime calls (see `islandEntryPlugin` in
 * framework/assets/client.ts). After first paint it imports the scene, which
 * draws a WebGL2 room over the dashboard and drives it from the dashboard's
 * own links. Where WebGL2 is missing, or only available in software, `boot`
 * declines and the dashboard stays as it is.
 *
 * The engine is a second, lazy chunk so the scene only loads where an island
 * mounts at all.
 */
export default function mount(): () => void {
  const root = document.querySelector<HTMLElement>('[data-ch-root]')
  if (!root) return () => undefined
  let live = true
  let dispose: (() => void) | undefined
  import('./channels/engine')
    .then(({ boot }) => {
      if (live) dispose = boot(root)
    })
    .catch((error: unknown) => {
      // The dashboard is already the page; a scene that fails to load
      // leaves it alone.
      console.warn('channels: scene unavailable', error)
    })
  return () => {
    live = false
    dispose?.()
  }
}
