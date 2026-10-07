import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DottedButton, dottedButtonClass } from './DottedButton'

describe('DottedButton', () => {
  it('is a plain button by default and forwards props and clicks', async () => {
    const onClick = vi.fn()
    render(<DottedButton onClick={onClick} aria-label="Go">Go</DottedButton>)
    const button = screen.getByRole('button', { name: 'Go' })
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('can be a submit button and merges extra classes', () => {
    render(<DottedButton type="submit" className="extra">Search</DottedButton>)
    const button = screen.getByRole('button', { name: 'Search' })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toHaveClass('extra')
    expect(button.className).toContain(dottedButtonClass)
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(<DottedButton disabled onClick={onClick}>Nope</DottedButton>)
    await userEvent.click(screen.getByRole('button', { name: 'Nope' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders its label and an aria-hidden dot canvas', () => {
    const { container } = render(<DottedButton>Search</DottedButton>)
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
    expect(container.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true')
  })
})
