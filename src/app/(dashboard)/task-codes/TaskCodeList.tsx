'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { deleteTaskCode } from './actions'
import type { TaskCodeRow } from '@/types/task-code'
import { UNIT_OF_MEASURE_LABELS } from '@/types/task-code'

export default function TaskCodeList({
  taskCodes,
  isAdmin,
}: {
  taskCodes: TaskCodeRow[]
  isAdmin: boolean
}) {
  const [search, setSearch]          = useState('')
  const [deletingId, setDeletingId]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = taskCodes.filter((t) => {
    const q = search.toLowerCase()
    return (
      !q ||
      t.task_code.toLowerCase().includes(q) ||
      t.task_name.toLowerCase().includes(q) ||
      (t.description?.toLowerCase().includes(q) ?? false) ||
      (t.task_types?.type_name.toLowerCase().includes(q) ?? false) ||
      (t.positions?.position_name.toLowerCase().includes(q) ?? false)
    )
  })

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete task code "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    startTransition(async () => {
      await deleteTaskCode(id)
      setDeletingId(null)
    })
  }

  const colCount = isAdmin ? 7 : 6

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by code, name, task type, position, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[320px] max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <span className="text-sm text-gray-400 ml-auto">
          {filtered.length} of {taskCodes.length} task codes
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Code', 'Name', 'Task Type', 'Position', 'Unit of Measure', 'Rate', ...(isAdmin ? ['Actions'] : [])].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-16 text-center">
                  <p className="text-sm font-medium text-gray-400">
                    {taskCodes.length === 0
                      ? 'No task codes defined yet.'
                      : 'No task codes match your search.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-semibold text-gray-800">
                      {t.task_code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {t.task_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {t.task_types?.type_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {t.positions?.position_name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 whitespace-nowrap">
                      {UNIT_OF_MEASURE_LABELS[t.unit_of_measure]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                    {t.production_rate != null ? t.production_rate.toLocaleString() : '—'}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/task-codes/${t.id}/edit`}
                          className="text-sm text-brand-600 hover:text-brand-800 font-medium"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(t.id, t.task_name)}
                          disabled={isPending && deletingId === t.id}
                          className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                        >
                          {isPending && deletingId === t.id ? 'Deleting…' : 'Delete'}
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
