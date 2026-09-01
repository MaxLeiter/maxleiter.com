import type { AnchorHTMLAttributes, ReactNode } from 'react'

/**
 * `next/link` stands in as a plain anchor at build time.
 *
 * esbuild aliases the bare `next/link` specifier to this module, which lets the
 * existing components under `app/components/` render unchanged instead of being
 * forked. Every Next-only prop is dropped so none of them leak into the markup
 * as invalid DOM attributes.
 */

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string | { pathname?: string }
  children?: ReactNode
  prefetch?: boolean | null
  replace?: boolean
  scroll?: boolean
  shallow?: boolean
  passHref?: boolean
  legacyBehavior?: boolean
  locale?: string | false
  as?: string
}

export default function Link({
  href,
  children,
  prefetch: _prefetch,
  replace: _replace,
  scroll: _scroll,
  shallow: _shallow,
  passHref: _passHref,
  legacyBehavior: _legacyBehavior,
  locale: _locale,
  as: _as,
  ...rest
}: Props) {
  const resolved = typeof href === 'string' ? href : (href?.pathname ?? '')
  return (
    <a href={resolved} {...rest}>
      {children}
    </a>
  )
}
