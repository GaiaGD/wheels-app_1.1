import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DotField } from './DotField'

describe('DotField', () => {
  it('renders an aria-hidden canvas and forwards className', () => {
    const { container } = render(<div><DotField className="behind" /></div>)
    const canvas = container.querySelector('canvas')
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
    expect(canvas).toHaveClass('behind')
  })
})
