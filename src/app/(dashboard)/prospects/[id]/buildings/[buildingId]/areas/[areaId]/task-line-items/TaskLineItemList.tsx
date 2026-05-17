'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { deleteTaskLineItem } from './actions'
import type { TaskLineItemRow } from '@/types/task-line-item'

export default function TaskLineItemList({
  items,
  areaId,
  buildingId,
  prospectId,
  isAdmin,
}: {
  items: TaskLineItemRow[]
  areaId: string
  buildingId: string
  prospectId: string
  isAdmin: boolean
}) {
  const [search, setSearch]          = useState('')
  const [deletingId, setDeletingId]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = items.filter((item) => {
    const q = search.toLowerCase()
    return (
      !q ||
      item.task_name.toLowerCase().includes(q) ||
      (item.task_codes?.task_code.toLowerCase().includes(q) ?? false) ||
      (item.positions?.position_name.toLowerCase().includes(q) ?? false) ||
      (item.type?.toLowerCase().includes(q) ?? false)
    )
  })

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete task "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    startTransition(async () => {
      await deleteTaskLineItem(id, areaId, buildingId, prospectId)
      setDeletingId(null)
    })
  }

  const basePath = `/prospects/${prospectId}/buildings/${buildingId}/areas/${areaId}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by code, name, position, or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[280px] max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <Link
          href={`${basePath}/task-line-items/new`}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          + Add Task
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Prt', 'Code', 'Task Name', 'Position', 'Freq', 'Qty', 'Rate', 'Yearly Hrs', 'Actions'].map((h) => (
                <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <p className="text-sm font-medium text-gray-400">
                    {items.length === 0
                      ? 'No tasks added yet — click "+ Add Task" to get started.'
                      : 'No tasks match your search.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3 text-center">
                    <span className={`text-xs font-medium ${item.print ? 'text-green-600' : 'text-gray-300'}`}>
                      {item.print ? '✓' : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                    {item.task_codes?.task_code ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {item.task_name}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {item.positions?.position_name ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700 tabular-nums whitespace-nowrap">
                    {item.frequency ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700 tabular-nums whitespace-nowrap">
                    {item.quantity != null ? item.quantity.toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700 tabular-nums whitespace-nowrap">
                    {item.minutes != null ? item.minutes.toLocaleString() : '—'}
                    {item.measure && (
                      <span className="ml-1 text-xs text-gray-400">
                        {item.measure === 'sqft_per_hour' ? 'sf/hr' : 'min/u'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm font-medium text-gray-900 tabular-nums whitespace-nowrap">
                    {item.yearly_hrs != null ? item.yearly_hrs.toFixed(2) : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`${basePath}/task-line-items/${item.id}/edit`}
                        className="text-sm text-brand-600 hover:text-brand-800 font-medium"
                      >
                        Edit
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(item.id, item.task_name)}
                          disabled={isPending && deletingId === item.id}
                          className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                        >
                          {isPending && deletingId === item.id ? 'Deleting…' : 'Delete'}
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
