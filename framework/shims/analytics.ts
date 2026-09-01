/**
 * `@vercel/analytics` stands in as a no-op in the server bundle.
 *
 * Four components import `track` at module scope purely to call it from click
 * handlers, which never fire during a static render. Client bundles use the
 * real package (or `window.va`, which is what it calls); only the build-time
 * render sees this file.
 */

export function track(_name: string, _data?: Record<string, unknown>): void {
  // Click handlers never fire while rendering to markup.
}

export function inject(): void {
  // The insights script is added by the HTML shell instead.
}

export default { track, inject }
