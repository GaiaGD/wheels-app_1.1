import type { ProviderError } from './result'

export function userMessage(error: ProviderError): { title: string; body: string } {
  switch (error.kind) {
    case 'bad_input':
      return { title: 'Check your search', body: 'Something in the search doesn\'t look right. Check the codes and try again.' }
    case 'not_found':
      return { title: 'No flight found', body: 'We couldn\'t find a matching flight. Double-check the flight number and date.' }
    case 'rate_limited':
      return { title: 'Too many requests', body: 'We\'ve hit our data limit for now. Please try again in a few minutes.' }
    case 'provider_down':
      return { title: 'Flight data is unavailable', body: 'Our flight data source isn\'t responding. Please try again shortly.' }
    case 'bad_data':
      return { title: 'Unreadable flight data', body: 'The data we received didn\'t make sense. Please try again later.' }
    case 'misconfigured':
      return { title: 'Something went wrong on our side', body: 'The app is not set up correctly right now. Please try again later.' }
  }
}
