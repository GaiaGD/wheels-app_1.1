import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HaloInput } from './HaloInput'

describe('HaloInput', () => {
  it('forwards ref and id', () => {
    const ref = createRef<HTMLInputElement>()
    render(<HaloInput ref={ref} id="x" aria-label="Name" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
    expect(ref.current?.id).toBe('x')
  })

  it('forwards ARIA attributes and event handlers', async () => {
    const onChange = vi.fn()
    const onKeyDown = vi.fn()
    render(
      <HaloInput role="combobox" aria-expanded={false} aria-controls="l" aria-autocomplete="list" aria-describedby="d" aria-label="Name" onChange={onChange} onKeyDown={onKeyDown} />,
    )
    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('aria-controls', 'l')
    expect(input).toHaveAttribute('aria-autocomplete', 'list')
    expect(input).toHaveAttribute('aria-describedby', 'd')
    await userEvent.type(input, 'ab')
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onKeyDown).toHaveBeenCalled()
  })

  it('invalid sets aria-invalid and data-invalid', () => {
    render(<HaloInput invalid aria-label="Name" />)
    const input = screen.getByLabelText('Name')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('data-invalid')
  })

  it('an explicit aria-invalid also marks it invalid', () => {
    render(<HaloInput aria-invalid aria-label="Name" />)
    const input = screen.getByLabelText('Name')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('data-invalid')
  })

  it('is not invalid by default', () => {
    render(<HaloInput aria-label="Name" />)
    const input = screen.getByLabelText('Name')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('data-invalid')
  })

  it('renders leading and trailing slots', () => {
    render(<HaloInput aria-label="Name" leadingSlot={<span>lead</span>} trailingSlot={<span>trail</span>} />)
    expect(screen.getByText('lead')).toBeInTheDocument()
    expect(screen.getByText('trail')).toBeInTheDocument()
  })

  it('forwards disabled', () => {
    render(<HaloInput disabled aria-label="Name" />)
    expect(screen.getByLabelText('Name')).toBeDisabled()
  })

  it('marks the glow aria-hidden', () => {
    const { container } = render(<HaloInput aria-label="Name" />)
    const glow = container.querySelector('[aria-hidden="true"]')
    expect(glow).not.toBeNull()
    expect(glow?.querySelectorAll('[data-halo-blob]').length).toBe(2)
  })
})
