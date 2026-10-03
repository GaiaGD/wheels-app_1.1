'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { Suggestion } from '@/lib/autocomplete'
import styles from './AutocompleteField.module.css'

interface Props {
  label: string
  endpoint: '/api/airports' | '/api/airlines'
  placeholder: string
  onSelect: (code: string | null) => void
  error?: string
}

const CODE_PATTERN = {
  '/api/airports': /^[A-Za-z]{3}$/,
  '/api/airlines': /^(?:[A-Za-z][A-Za-z0-9]|[0-9][A-Za-z])$/,
}

export function AutocompleteField({ label, endpoint, placeholder, onSelect, error }: Props) {
  const id = useId()
  const listId = `${id}-list`
  const [text, setText] = useState('')
  const [items, setItems] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [unavailable, setUnavailable] = useState(false)
  const skipFetch = useRef(false)
  const selected = useRef(false)

  useEffect(() => {
    if (skipFetch.current) {
      skipFetch.current = false
      return
    }
    if (text.trim().length < 2) {
      setItems([])
      setOpen(false)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(text.trim())}`, { signal: controller.signal })
        if (!res.ok) throw new Error('bad status')
        setItems(await res.json())
        setUnavailable(false)
        setOpen(true)
        setActive(-1)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setItems([])
          setUnavailable(true)
        }
      }
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [text, endpoint])

  function choose(item: Suggestion) {
    skipFetch.current = true
    selected.current = true
    setText(item.label)
    setItems([])
    setOpen(false)
    setActive(-1)
    onSelect(item.code)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (items.length) { setOpen(true); setActive((a) => Math.min(a + 1, items.length - 1)) }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && open && active >= 0) {
      e.preventDefault()
      choose(items[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function onBlur() {
    window.setTimeout(() => setOpen(false), 150)
    if (!selected.current && CODE_PATTERN[endpoint].test(text.trim())) {
      onSelect(text.trim().toUpperCase())
    }
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          selected.current = false
          setText(e.target.value)
          onSelect(null)
        }}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      <ul id={listId} role="listbox" className={styles.list} hidden={!(open && items.length > 0)}>
        {items.map((item, i) => (
          <li
            key={item.code}
            id={`${id}-opt-${i}`}
            role="option"
            aria-selected={i === active}
            className={i === active ? styles.active : undefined}
            onMouseDown={(e) => { e.preventDefault(); choose(item) }}
          >
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </li>
        ))}
      </ul>
      {unavailable && <p role="status" className={styles.note}>Suggestions unavailable. Type the code instead.</p>}
      {error && <p id={`${id}-err`} role="alert" className={styles.error}>{error}</p>}
    </div>
  )
}
