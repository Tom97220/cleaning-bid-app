'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { deleteLaborCostType } from './actions'
import type { LaborCostType } from '@/types/cost-type-lookup'

export default function LaborCostTypeList({ items }: { items: LaborCostType[] }) {
  const [search, setSearch]          = useState('')
  const [deletingId, setDeletingId]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = items.filter(
    (t) => !search || t.name.toLowerCase().includes(search.toLowerCase()),
  )

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete labor cost type "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    startTransition(async () => {
      await deleteLaborCostType(id)
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[280px] max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <span className="text-sm text-gray-400 ml-auto">
          {filtered.length} of {items.length} types
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Name', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-16 text-center">
                  <p className="text-sm font-medium text-gray-400">
                    {items.length === 0 ? 'No labor cost types defined yet.' : 'No types match your search.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/labor-cost-types/${t.id}/edit`}
                        className="text-sm text-brand-600 hover:text-brand-800 font-medium"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        disabled={isPending && deletingId === t.id}
                        className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                      >
                        {isPending && deletingId === t.id ? 'Deleting…' : 'Delete'}
                      </button>
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
