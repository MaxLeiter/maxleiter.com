import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'

/**
 * `next/dynamic` stands in as `React.lazy` + `Suspense` at build time.
 *
 * Nothing on the Phase 1 pages uses it: server-rendered components are imported
 * directly and interactive ones go through `<Island>`. It exists so that a
 * stray import somewhere in the module graph does not break the server bundle.
 * A lazy component cannot resolve during `renderToStaticMarkup`, so the loading
 * fallback is what lands in the markup.
 */

interface Options {
  ssr?: boolean
  loading?: () => ReactNode
}

export default function dynamic<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
  options: Options = {},
): ComponentType<P> {
  const Loaded = lazy(async () => {
    const mod = await loader()
    return 'default' in mod
      ? (mod as { default: ComponentType<P> })
      : { default: mod }
  })
  const fallback = options.loading ? options.loading() : null
  return function Dynamic(props: P) {
    return (
      <Suspense fallback={fallback}>
        <Loaded {...props} />
      </Suspense>
    )
  }
}
