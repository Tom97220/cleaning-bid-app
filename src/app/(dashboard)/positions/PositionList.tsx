'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { deletePosition } from './actions'
import type { Position } from '@/types/position'

export default function PositionList({
  positions,
  isAdmin,
}: {
  positions: Position[]
  isAdmin: boolean
}) {
  const [search, setSearch]          = useState('')
  const [deletingId, setDeletingId]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = positions.filter((p) => {
    const q = search.toLowerCase()
    return (
      !q ||
      p.position_code.toLowerCase().includes(q) ||
      p.position_name.toLowerCase().includes(q) ||
      (p.description?.toLowerCase().includes(q) ?? false)
    )
  })

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete position "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    startTransition(async () => {
      await deletePosition(id)
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by code, name, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[280px] max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <span className="text-sm text-gray-400 ml-auto">
          {filtered.length} of {positions.length} positions
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Code', 'Name', 'Description', ...(isAdmin ? ['Actions'] : [])].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="px-4 py-16 text-center">
                  <p className="text-sm font-medium text-gray-400">
                    {positions.length === 0
                      ? 'No positions defined yet.'
                      : 'No positions match your search.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-semibold text-gray-800">
                      {p.position_code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {p.position_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                    {p.description ?? '—'}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/positions/${p.id}/edit`}
                          className="text-sm text-brand-600 hover:text-brand-800 font-medium"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id, p.position_name)}
                          disabled={isPending && deletingId === p.id}
                          className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                        >
                          {isPending && deletingId === p.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
