/**
 * Decoding the entities React's static markup emits.
 *
 * The build reads class attributes and island props back out of rendered
 * bodies, and `tools/snapshot.ts` reads titles and prose back out of the
 * finished HTML. Two decoders of the same markup had already drifted apart
 * (one knew `nbsp`, one was case-insensitive), and the snapshot's hashes
 * depend on this one decoding exactly as it does.
 *
 * In `shared/`: this file may import nothing but node builtins and React
 * types, because the build, the client bundle and `tools/` all reach it.
 */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/** Named entities above plus numeric ones; anything else is left as is. */
export function decodeEntities(html: string): string {
  return html.replace(
    /&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g,
    (whole, body: string) => {
      if (body[1] === 'x' || body[1] === 'X') {
        return String.fromCodePoint(Number.parseInt(body.slice(2), 16))
      }
      if (body[0] === '#') return String.fromCodePoint(Number(body.slice(1)))
      return ENTITIES[body] ?? whole
    },
  )
}
