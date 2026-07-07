'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { deleteBuilding } from './actions'
import type { BuildingRow } from '@/types/building'

export default function BuildingList({
  buildings,
  prospectId,
  isAdmin,
}: {
  buildings: BuildingRow[]
  prospectId: string
  isAdmin: boolean
}) {
  const [search, setSearch]          = useState('')
  const [deletingId, setDeletingId]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = buildings.filter((b) => {
    const q = search.toLowerCase()
    return (
      !q ||
      b.building_name.toLowerCase().includes(q) ||
      (b.city?.toLowerCase().includes(q) ?? false) ||
      (b.address?.toLowerCase().includes(q) ?? false) ||
      (b.building_types?.type_name.toLowerCase().includes(q) ?? false)
    )
  })

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete building "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    startTransition(async () => {
      await deleteBuilding(id, prospectId)
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by name, type, or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[280px] max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <Link
          href={`/prospects/${prospectId}/buildings/new`}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          + Add Building
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Building Name', 'Type', 'Address', 'Sq Ft', 'Floors', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-sm font-medium text-gray-400">
                    {buildings.length === 0
                      ? 'No buildings added yet — click "+ Add Building" to get started.'
                      : 'No buildings match your search.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                    <Link
                      href={`/prospects/${prospectId}/buildings/${b.id}`}
                      className="text-brand-600 hover:text-brand-800"
                    >
                      {b.building_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {b.building_types?.type_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {[b.address, b.city, b.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 tabular-nums whitespace-nowrap">
                    {b.square_feet != null ? b.square_feet.toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                    {b.floors ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/prospects/${prospectId}/buildings/${b.id}`}
                        className="text-sm text-brand-600 hover:text-brand-800 font-medium"
                      >
                        View
                      </Link>
                      <Link
                        href={`/prospects/${prospectId}/buildings/${b.id}/edit`}
                        className="text-sm text-brand-600 hover:text-brand-800 font-medium"
                      >
                        Edit
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(b.id, b.building_name)}
                          disabled={isPending && deletingId === b.id}
                          className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                        >
                          {isPending && deletingId === b.id ? 'Deleting…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
