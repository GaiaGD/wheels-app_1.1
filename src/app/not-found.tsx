import Link from 'next/link'
import { ErrorPanel } from '@/components/ErrorState/ErrorPanel'

export default function NotFound() {
  return (
    <ErrorPanel title="Page not found" body="That page doesn’t exist.">
      <Link href="/" className="button">Back to search</Link>
    </ErrorPanel>
  )
}
