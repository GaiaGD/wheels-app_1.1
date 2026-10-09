import { DottedLink } from '@/components/DottedButton/DottedButton'
import { userMessage } from '@/lib/messages'
import type { ProviderError } from '@/lib/result'
import { ErrorPanel } from './ErrorPanel'

export function ErrorState({ error, variant }: { error: ProviderError; variant?: 'unconfirmed' }) {
  const { title, body } =
    variant === 'unconfirmed'
      ? {
          title: 'We couldn’t confirm this flight',
          body: 'We found flights with this number, but none matching those airports or that date.',
        }
      : userMessage(error)
  return (
    <ErrorPanel title={title} body={body}>
      <DottedLink href="/">Search again</DottedLink>
    </ErrorPanel>
  )
}
