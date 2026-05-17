'use client'

import { useState } from 'react'

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

  const filtered = hasTyped
    ? options.filter((o) =>
        (o.searchText ?? o.label).toLowerCase().includes(inputValue.toLowerCase())
      )
    : options

  function select(value: string, label: string) {
    setSelectedId(value)
    setInputValue(label)
    setHasTyped(false)
    setOpen(false)
    onSelect?.(value)
  }

  function handleFocus() {
    setHasTyped(false)
    setOpen(true)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value)
    setSelectedId('')
    setHasTyped(true)
    setOpen(true)
  }

  function handleBlur() {
    setTimeout(() => {
      setOpen(false)
      setHasTyped(false)
      if (!selectedId) setInputValue('')
    }, 150)
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
        placeholder={placeholder}
        autoComplete="off"
        className={inputClass}
      />
      {open && (
        <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-auto text-sm">
          <li
            onMouseDown={() => select('', '')}
            className="px-3 py-2 text-gray-400 hover:bg-gray-50 cursor-pointer italic"
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
            filtered.map((o) => (
              <li
                key={o.value}
                onMouseDown={() => select(o.value, o.label)}
                className={`px-3 py-2 cursor-pointer hover:bg-brand-50 ${
                  selectedId === o.value
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-gray-900'
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
