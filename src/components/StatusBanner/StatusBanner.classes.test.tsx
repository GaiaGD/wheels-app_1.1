import { render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

// Simulate a stylesheet that defines no per-status class: the component must not emit "undefined".
vi.mock('./StatusBanner.module.css', () => ({ default: { banner: 'banner' } }))
import { StatusBanner } from './StatusBanner'

it.each(['scheduled', 'landed', 'in_air', 'delayed'] as const)('does not render an "undefined" class for %s', (status) => {
  const { container } = render(<StatusBanner status={status} delayMinutes={null} />)
  expect(container.innerHTML).not.toContain('undefined')
})
