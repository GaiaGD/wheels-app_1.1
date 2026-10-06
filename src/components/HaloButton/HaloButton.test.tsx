import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HaloButton, haloButtonClass } from './HaloButton'

describe('HaloButton', () => {
  it('is a plain button by default and forwards props and clicks', async () => {
    const onClick = vi.fn()
    render(<HaloButton onClick={onClick} aria-label="Go">Go</HaloButton>)
    const button = screen.getByRole('button', { name: 'Go' })
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('can be a submit button and merges extra classes', () => {
    render(<HaloButton type="submit" className="extra">Search</HaloButton>)
    const button = screen.getByRole('button', { name: 'Search' })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toHaveClass('extra')
    expect(button.className).toContain(haloButtonClass)
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(<HaloButton disabled onClick={onClick}>Nope</HaloButton>)
    await userEvent.click(screen.getByRole('button', { name: 'Nope' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})
