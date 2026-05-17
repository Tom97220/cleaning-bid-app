'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { deleteArea } from './actions'
import type { Area } from '@/types/area'
import { formatFrequency } from '@/types/area'

export default function AreaList({
  areas,
  buildingId,
  prospectId,
  isAdmin,
}: {
  areas: Area[]
  buildingId: string
  prospectId: string
  isAdmin: boolean
}) {
  const [search, setSearch]          = useState('')
  const [deletingId, setDeletingId]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = areas.filter((a) => {
    const q = search.toLowerCase()
    return (
      !q ||
      a.area_name.toLowerCase().includes(q) ||
      (a.frequency != null && formatFrequency(a.frequency).toLowerCase().includes(q)) ||
      (a.notes?.toLowerCase().includes(q) ?? false)
    )
  })

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete area "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    startTransition(async () => {
      await deleteArea(id, buildingId, prospectId)
      setDeletingId(null)
    })
  }

  const basePath = `/prospects/${prospectId}/buildings/${buildingId}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by name, frequency, or notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[280px] max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <Link
          href={`${basePath}/areas/new`}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          + Add Area
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['#', 'Area Name', 'Sq Ft', 'Frequency', 'Notes', 'Actions'].map((h) => (
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
                    {areas.length === 0
                      ? 'No areas added yet — click "+ Add Area" to get started.'
                      : 'No areas match your search.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-400 tabular-nums w-10">
                    {a.print_order ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {a.area_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 tabular-nums whitespace-nowrap">
                    {a.square_footage != null ? a.square_footage.toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {a.frequency != null ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 whitespace-nowrap">
                        {formatFrequency(a.frequency)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                    {a.notes ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`${basePath}/areas/${a.id}/edit`}
                        className="text-sm text-brand-600 hover:text-brand-800 font-medium"
                      >
                        Edit
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(a.id, a.area_name)}
                          disabled={isPending && deletingId === a.id}
                          className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                        >
                          {isPending && deletingId === a.id ? 'Deleting…' : 'Delete'}
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
