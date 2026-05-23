'use client'

import { useState, useRef, useEffect } from 'react'

export interface SelectOption {
  value:       string
  label:       string
  searchText?: string
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

export default function SearchableSelect({
  name,
  options,
  defaultValue,
  placeholder = 'Search...',
  onSelect,
}: {
  name: string
  options: SelectOption[]
  defaultValue?: string | null
  placeholder?: string
  onSelect?: (value: string) => void
}) {
  const defaultOption               = options.find((o) => o.value === defaultValue)
  const [inputValue, setInputValue] = useState(defaultOption?.label ?? '')
  const [selectedId, setSelectedId] = useState(defaultValue ?? '')
  const [open, setOpen]             = useState(false)
  const [hasTyped, setHasTyped]     = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = hasTyped
    ? options.filter((o) =>
        (o.searchText ?? o.label).toLowerCase().includes(inputValue.toLowerCase())
      )
    : options

  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return
    const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex])

  function select(value: string, label: string) {
    setSelectedId(value)
    setInputValue(label)
    setHasTyped(false)
    setHighlightedIndex(-1)
    setOpen(false)
    onSelect?.(value)
  }

  function handleFocus() {
    setHasTyped(false)
    setHighlightedIndex(-1)
    setOpen(true)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value)
    setSelectedId('')
    setHasTyped(true)
    setHighlightedIndex(-1)
    setOpen(true)
  }

  function handleBlur() {
    setTimeout(() => {
      setOpen(false)
      setHasTyped(false)
      setHighlightedIndex(-1)
      if (!selectedId) setInputValue('')
    }, 150)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const total = 1 + filtered.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      setHighlightedIndex((i) => Math.min(i + 1, total - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (!open || highlightedIndex < 0) return
      e.preventDefault()
      if (highlightedIndex === 0) {
        select('', '')
      } else {
        const item = filtered[highlightedIndex - 1]
        if (item) select(item.value, item.label)
      }
    } else if (e.key === 'Tab') {
      if (!open || highlightedIndex < 0) return
      if (highlightedIndex === 0) {
        select('', '')
      } else {
        const item = filtered[highlightedIndex - 1]
        if (item) select(item.value, item.label)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setHasTyped(false)
      setHighlightedIndex(-1)
      setInputValue(options.find((o) => o.value === selectedId)?.label ?? '')
    }
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selectedId} />
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClass}
      />
      {open && (
        <ul ref={listRef} className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-auto text-sm">
          <li
            onMouseDown={() => select('', '')}
            className={`px-3 py-2 text-gray-400 cursor-pointer italic ${
              highlightedIndex === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'
            }`}
          >
            — None —
          </li>
          {options.length === 0 ? (
            <li className="px-3 py-2 text-gray-400 italic">No options defined yet</li>
          ) : filtered.length === 0 ? (
            <li className="px-3 py-2 text-gray-400 italic">
              No matches for &ldquo;{inputValue}&rdquo;
            </li>
          ) : (
            filtered.map((o, i) => (
              <li
                key={o.value}
                onMouseDown={() => select(o.value, o.label)}
                className={`px-3 py-2 cursor-pointer ${
                  highlightedIndex === i + 1
                    ? 'bg-blue-50 text-blue-900 font-medium'
                    : selectedId === o.value
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-gray-900 hover:bg-brand-50'
                }`}
              >
                {o.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
