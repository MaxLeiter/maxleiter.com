'use client'

import Button from '@components/button'

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error
  // 16.3 made `retry` stable: unlike `reset`, it refreshes the boundary's
  // server data instead of only clearing local error state.
  retry: () => void
}) {
  return (
    <article>
      <h1>Something went wrong</h1>
      <p>
        <Button onClick={() => retry()}>Try again</Button>
      </p>

      <pre>{error.message}</pre>
    </article>
  )
}
