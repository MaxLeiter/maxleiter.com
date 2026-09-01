/**
 * The posts pinned above the recent list on /blog and on the desktop widget.
 *
 * The single declaration: `framework/content.ts` used to carry a second copy
 * with no importers, and the desktop island a third. Client-safe on purpose,
 * for the same reason `entryHref` is (see `@lib/blog-post`).
 */
export const POPULAR_SLUGS = ['weights', 'xios', 'formatting']
