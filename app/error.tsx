'use client'

import Button from '@components/button'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <article>
      <h1>Something went wrong</h1>
      <p>
        <Button onClick={reset}>Try again</Button>
      </p>

      <pre>{error.message}</pre>
    </article>
  )
}
