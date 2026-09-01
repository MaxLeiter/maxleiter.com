/**
 * Committed inputs: read what the repo already has, fetch only what is
 * missing, write it back so the next build touches the network zero times.
 *
 * Two modules work this way and they had opposite failure policies with
 * nothing saying the difference was deliberate. It is: a missing tweet fails
 * the build, because a degraded card would otherwise ship unnoticed, while a
 * missing image measurement warns and lets `<Img>` fall back to its guess.
 * Passing `onMiss` makes that a visible argument rather than two hand-written
 * loops that happen to differ.
 *
 * This is NOT for caches. `.cache/og/` is content-hashed, gitignored and
 * disposable; these files are inputs, tracked in git, and their absence is a
 * question about the build rather than a cold start.
 */

export interface CommittedInput<T> {
  /** Plural noun for the log line, e.g. `tweets`. */
  label: string
  keys: string[]
  /** The committed value, or null when it is not there yet. */
  read: (key: string) => Promise<T | null>
  /**
   * Fetch one missing value. Throw to explain why it could not be had; the
   * message is what `onMiss` either raises or warns with.
   */
  fetch: (key: string) => Promise<T>
  /** Write the newly fetched values into the repo. Sorted by key. */
  persist: (added: [string, T][]) => Promise<void>
  /** `fail` stops the build on a miss; `warn` logs and carries on without it. */
  onMiss: 'fail' | 'warn'
}

export async function loadCommitted<T>(
  input: CommittedInput<T>,
): Promise<Map<string, T>> {
  const found = new Map<string, T>()
  const missing: string[] = []
  await Promise.all(
    input.keys.map(async (key) => {
      const value = await input.read(key)
      if (value === null) missing.push(key)
      else found.set(key, value)
    }),
  )
  if (missing.length === 0) return found

  // Sorted because the reads above resolve in whatever order the filesystem
  // hands back, and the log line and the written files should not depend on it.
  missing.sort()
  console.log(`  ${missing.length} ${input.label} not committed yet; fetching`)

  const fetched = await Promise.all(
    missing.map(async (key): Promise<[string, T] | null> => {
      try {
        return [key, await input.fetch(key)]
      } catch (error) {
        if (input.onMiss === 'fail') throw error
        console.warn(`  ${(error as Error).message}`)
        return null
      }
    }),
  )

  const added = fetched.filter((entry) => entry !== null)
  if (added.length > 0) {
    await input.persist(added)
    for (const [key, value] of added) found.set(key, value)
  }
  return found
}
