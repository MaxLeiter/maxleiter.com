import { Cover } from '@components/cover'

/**
 * The two shapes a section page lists things in: rows with a thumbnail of the
 * item's cover, and a grid of full tiles. Both are plain links; an external
 * one opens in a new tab, as the old cards did.
 */

export interface ListItem {
  href: string
  title: string
  /** The cover seed, which is what makes the thumbnail match the homepage. */
  seed: string
  /** Upper-case meta line, shared with the cover's own. */
  meta: string
  desc?: string
  chip?: string
  tags?: string[]
  external?: boolean
  /** Opt in to the router's morph into the article's cover. */
  vtName?: string
}

function linkProps(item: ListItem) {
  return item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}
}

function ExternalMark() {
  return (
    <svg className="ui-ext" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  )
}

export function EntryList({ items }: { items: ListItem[] }) {
  return (
    <ul className="ui-list">
      {items.map((item) => (
        <li key={item.href}>
          <a className="ui-row" href={item.href} {...linkProps(item)}>
            <span className="ui-thumb">
              <Cover
                seed={item.seed}
                title={item.title}
                meta={item.meta}
                chip={item.chip ?? ''}
                mini
              />
            </span>
            <span className="ui-row-text">
              <span className="ui-row-m">
                {item.meta}
                {item.external && (
                  <span className="ui-sr"> (opens in a new tab)</span>
                )}
              </span>
              <span className="ui-row-t">
                {item.title}
                {item.external && <ExternalMark />}
              </span>
              {item.desc && <span className="ui-row-d">{item.desc}</span>}
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

export function TileGrid({ items }: { items: ListItem[] }) {
  return (
    <ul className="ui-grid">
      {items.map((item) => (
        <li key={item.href}>
          <a
            className="ui-tile"
            href={item.href}
            data-vt-name={item.vtName}
            {...linkProps(item)}
          >
            <Cover
              seed={item.seed}
              title={item.title}
              meta={item.meta}
              chip={item.chip ?? ''}
            />
            <span className="ui-tile-t">
              {item.title}
              {item.external && (
                <>
                  <ExternalMark />
                  <span className="ui-sr"> (opens in a new tab)</span>
                </>
              )}
            </span>
            {item.desc && <span className="ui-tile-d">{item.desc}</span>}
            {item.tags && item.tags.length > 0 && (
              <span className="ui-tags">
                {item.tags.map((tag) => (
                  <span className="ui-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </span>
            )}
          </a>
        </li>
      ))}
    </ul>
  )
}
