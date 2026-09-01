/**
 * `next/navigation` stands in as inert stubs at build time.
 *
 * The client components that survive into the static render call `useRouter()`
 * during render and only ever use the result inside event handlers, which never
 * fire while rendering to markup. `notFound()` is unreachable: the build only
 * emits pages for slugs that exist.
 */

export interface AppRouterInstance {
  push: (href: string) => void
  replace: (href: string) => void
  refresh: () => void
  back: () => void
  forward: () => void
  prefetch: (href: string) => void
}

function noop(): void {
  // Navigation during a static render is a no-op by construction.
}

const router: AppRouterInstance = {
  push: noop,
  replace: noop,
  refresh: noop,
  back: noop,
  forward: noop,
  prefetch: noop,
}

export function useRouter(): AppRouterInstance {
  return router
}

export function usePathname(): string {
  return '/'
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams()
}

export function useParams(): Record<string, string> {
  return {}
}

export function notFound(): never {
  throw new Error('notFound() called during a static build')
}

export function redirect(href: string): never {
  throw new Error(`redirect(${href}) called during a static build`)
}
