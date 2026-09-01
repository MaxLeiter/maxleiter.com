import fs from 'node:fs/promises'
import path from 'node:path'
import type { Tweet } from 'react-tweet/api'

/**
 * Tweet data, fetched once and committed to the repo.
 *
 * `react-tweet`'s `react-server` export condition selects an async server
 * component; outside an RSC graph the same import resolves to the client
 * variant and drags in swr. Calling `getTweet` explicitly at build sidesteps
 * that and ships zero client JavaScript.
 *
 * The payload lands in `app/data/tweets/<id>.json`, which is committed, so
 * builds are deterministic and work offline. The network is touched only when
 * a file is missing. A miss that cannot be fetched fails the build rather than
 * degrading to a bare link, because a degraded card would otherwise ship
 * unnoticed.
 */

const TWEET_TAG = /<Tweet\s[^>]*id=["']([0-9]+)["']/g

export type TweetMap = Record<string, Tweet>

export function collectTweetIds(sources: string[]): string[] {
  const ids = new Set<string>()
  for (const source of sources) {
    for (const match of source.matchAll(TWEET_TAG)) ids.add(match[1])
  }
  return [...ids].sort()
}

export function tweetCacheDir(root: string): string {
  return path.join(root, 'app', 'data', 'tweets')
}

export async function loadTweets(
  root: string,
  ids: string[],
): Promise<TweetMap> {
  if (ids.length === 0) return {}
  const dir = tweetCacheDir(root)
  await fs.mkdir(dir, { recursive: true })

  const entries = await Promise.all(
    ids.map(async (id): Promise<[string, Tweet]> => {
      const file = path.join(dir, `${id}.json`)
      try {
        return [id, JSON.parse(await fs.readFile(file, 'utf8')) as Tweet]
      } catch {
        // Not committed yet; fetch once and write it.
      }

      let fetched: Tweet | undefined
      try {
        const { getTweet } = await import('react-tweet/api')
        fetched = await getTweet(id)
      } catch (error) {
        throw new Error(
          `tweet ${id} is not cached at ${path.relative(root, file)} and ` +
            `could not be fetched: ${(error as Error).message}`,
        )
      }
      if (!fetched) {
        throw new Error(
          `tweet ${id} is not cached at ${path.relative(root, file)} and the ` +
            'API returned nothing (deleted, private, or rate limited)',
        )
      }

      await fs.writeFile(file, `${JSON.stringify(fetched, null, 2)}\n`)
      console.log(`  fetched tweet ${id} -> ${path.relative(root, file)}`)
      return [id, fetched]
    }),
  )

  return Object.fromEntries(entries)
}
