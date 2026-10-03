'use client'

import { ErrorPanel } from '@/components/ErrorState/ErrorPanel'

// `retry` is the stable replacement for `reset` in Next 16.3 (re-fetches and re-renders the segment).
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <ErrorPanel title="Something went wrong" body="An unexpected error happened. You can try again.">
      <button className="button" onClick={() => retry()}>Try again</button>
    </ErrorPanel>
  )
}
