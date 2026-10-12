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
  // The page may have started in the room's resting layout. If the scene
  // does not arrive, give the reader the flat rows rather than a stage
  // with nobody on it.
  const flat = () => {
    if (!root.classList.contains('ch-3d')) {
      delete document.documentElement.dataset.scene
    }
  }
  const fallback = window.setTimeout(() => {
    if (!root.classList.contains('ch-boot')) flat()
  }, 6000)
  import('./channels/engine')
    .then(({ boot }) => {
      if (live) dispose = boot(root)
    })
    .catch((error: unknown) => {
      flat()
      console.warn('channels: scene unavailable', error)
    })
  return () => {
    live = false
    clearTimeout(fallback)
    dispose?.()
  }
}
