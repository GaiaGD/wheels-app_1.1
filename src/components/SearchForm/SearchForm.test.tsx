import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

import { SearchForm } from './SearchForm'

beforeEach(() => {
  push.mockClear()
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('[]'))))
})
afterEach(() => vi.unstubAllGlobals())

describe('SearchForm', () => {
  it('shows inline errors and does not navigate when the route form is empty', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    await user.click(screen.getByRole('button', { name: /search/i }))
    expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(3)
    expect(push).not.toHaveBeenCalled()
  })

  it('navigates by route using typed codes', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    await user.type(screen.getByRole('combobox', { name: /departure/i }), 'jfk')
    await user.tab()
    await user.type(screen.getByRole('combobox', { name: /arrival/i }), 'lax')
    await user.tab()
    await user.type(screen.getByRole('combobox', { name: /airline/i }), 'aa')
    await user.tab()
    await user.click(screen.getByRole('button', { name: /search/i }))
    expect(push).toHaveBeenCalledWith('/search?dep=JFK&arr=LAX&airline=AA')
  })

  it('navigates by flight number with an optional date', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    await user.click(screen.getByRole('tab', { name: /flight number/i }))
    await user.type(screen.getByLabelText(/flight number/i), 'aa 123')
    await user.click(screen.getByRole('button', { name: /search/i }))
    expect(push).toHaveBeenCalledWith('/flight/AA123')
    await user.type(screen.getByLabelText(/date/i), '2026-10-05')
    await user.click(screen.getByRole('button', { name: /search/i }))
    expect(push).toHaveBeenLastCalledWith('/flight/AA123?date=2026-10-05')
  })

  it('rejects a malformed flight number inline', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    await user.click(screen.getByRole('tab', { name: /flight number/i }))
    await user.type(screen.getByLabelText(/flight number/i), 'xx')
    await user.click(screen.getByRole('button', { name: /search/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/flight number/i)
    expect(push).not.toHaveBeenCalled()
  })

  it('clears route selections when switching tabs and back', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    await user.type(screen.getByRole('combobox', { name: /departure/i }), 'jfk')
    await user.tab()
    await user.type(screen.getByRole('combobox', { name: /arrival/i }), 'lax')
    await user.tab()
    await user.type(screen.getByRole('combobox', { name: /airline/i }), 'aa')
    await user.tab()
    await user.click(screen.getByRole('tab', { name: /flight number/i }))
    await user.click(screen.getByRole('tab', { name: /by route/i }))
    await user.click(screen.getByRole('button', { name: /search/i }))
    expect(push).not.toHaveBeenCalled()
    expect(screen.getByText('Choose a departure airport')).toBeInTheDocument()
  })

  it('accepts typed codes when Enter is pressed in the last field', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    await user.type(screen.getByRole('combobox', { name: /departure/i }), 'jfk')
    await user.type(screen.getByRole('combobox', { name: /arrival/i }), 'lax')
    await user.type(screen.getByRole('combobox', { name: /airline/i }), 'aa{Enter}')
    expect(push).toHaveBeenCalledWith('/search?dep=JFK&arr=LAX&airline=AA')
  })

  it('links invalid inputs to their error text with aria-describedby', async () => {
    const user = userEvent.setup()
    render(<SearchForm />)
    await user.click(screen.getByRole('tab', { name: /flight number/i }))
    await user.type(screen.getByLabelText('Flight number'), '!!')
    await user.click(screen.getByRole('button', { name: /search/i }))
    const input = screen.getByLabelText('Flight number')
    const id = input.getAttribute('aria-describedby')
    expect(id).toBeTruthy()
    expect(document.getElementById(id!)).toHaveTextContent(/valid flight number/i)
  })
})
