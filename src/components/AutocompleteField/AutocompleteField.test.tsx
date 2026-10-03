import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AutocompleteField } from './AutocompleteField'

const suggestions = [
  { code: 'JFK', label: 'JFK · New York', detail: 'John F. Kennedy International, United States' },
  { code: 'LGA', label: 'LGA · New York', detail: 'LaGuardia, United States' },
]

afterEach(() => vi.unstubAllGlobals())

function setup() {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(suggestions)))))
  const onSelect = vi.fn()
  render(<AutocompleteField label="Departure airport" endpoint="/api/airports" placeholder="From" onSelect={onSelect} />)
  return { onSelect, user: userEvent.setup() }
}

describe('AutocompleteField', () => {
  it('is a labelled combobox that lists suggestions', async () => {
    const { user } = setup()
    await user.type(screen.getByRole('combobox', { name: 'Departure airport' }), 'new')
    expect(await screen.findAllByRole('option')).toHaveLength(2)
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true')
  })

  it('selects with the keyboard (arrows + Enter)', async () => {
    const { user, onSelect } = setup()
    await user.type(screen.getByRole('combobox'), 'new')
    await screen.findAllByRole('option')
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenLastCalledWith('LGA')
    expect(screen.getByRole('combobox')).toHaveValue('LGA · New York')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('closes on Escape and selects with the mouse', async () => {
    const { user, onSelect } = setup()
    await user.type(screen.getByRole('combobox'), 'new')
    await screen.findAllByRole('option')
    await user.keyboard('{Escape}')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    await user.clear(screen.getByRole('combobox'))
    await user.type(screen.getByRole('combobox'), 'new')
    await user.click((await screen.findAllByRole('option'))[0])
    expect(onSelect).toHaveBeenLastCalledWith('JFK')
  })

  it('accepts a typed code on blur when suggestions are unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    const onSelect = vi.fn()
    render(<AutocompleteField label="Departure airport" endpoint="/api/airports" placeholder="From" onSelect={onSelect} />)
    const user = userEvent.setup()
    await user.type(screen.getByRole('combobox'), 'jfk')
    await user.tab()
    expect(onSelect).toHaveBeenLastCalledWith('JFK')
  })

  it('does not reopen the list when a late fetch lands after blur', async () => {
    const { user } = setup()
    await user.type(screen.getByRole('combobox'), 'new')
    await user.tab()
    await act(async () => { await new Promise((r) => setTimeout(r, 350)) })
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false')
  })
})
