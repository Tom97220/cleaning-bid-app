'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { deleteTaskCode, setTaskCodeActive } from './actions'
import type { TaskCodeRow } from '@/types/task-code'
import { UNIT_OF_MEASURE_LABELS } from '@/types/task-code'

export default function TaskCodeList({
  taskCodes,
  isAdmin,
  usedCodeIds,
}: {
  taskCodes: TaskCodeRow[]
  isAdmin: boolean
  usedCodeIds: string[]
}) {
  const [search, setSearch]           = useState('')
  const [view, setView]               = useState<'active' | 'archived'>('active')
  const [pendingId, setPendingId]     = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  const usedSet = new Set(usedCodeIds)

  const activeCount   = taskCodes.filter((t) => t.is_active).length
  const archivedCount = taskCodes.length - activeCount

  const filtered = taskCodes.filter((t) => {
    // View toggle first: 'active' shows only is_active, 'archived' only inactive.
    if (view === 'active' ? !t.is_active : t.is_active) return false
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
    setPendingId(id)
    setActionError(null)
    startTransition(async () => {
      const result = await deleteTaskCode(id)
      if (result?.error) setActionError(result.error)
      setPendingId(null)
    })
  }

  function handleSetActive(id: string, active: boolean, name: string) {
    const verb = active ? 'Reactivate' : 'Retire'
    if (!confirm(`${verb} task code "${name}"?`)) return
    setPendingId(id)
    setActionError(null)
    startTransition(async () => {
      const result = await setTaskCodeActive(id, active)
      if (result?.error) setActionError(result.error)
      setPendingId(null)
    })
  }

  const colCount = isAdmin ? 7 : 6

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            type="button"
            onClick={() => setView('active')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              view === 'active' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setView('archived')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              view === 'archived' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Archived ({archivedCount})
          </button>
        </div>
        <input
          type="text"
          placeholder="Search by code, name, task type, position, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[320px] max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <span className="text-sm text-gray-400 ml-auto">
          {filtered.length} of {view === 'active' ? activeCount : archivedCount} {view} task codes
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
                      : view === 'archived' && archivedCount === 0
                      ? 'No archived task codes.'
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
                        {t.is_active ? (
                          <button
                            onClick={() => handleSetActive(t.id, false, t.task_name)}
                            disabled={isPending && pendingId === t.id}
                            className="text-sm text-amber-600 hover:text-amber-800 font-medium disabled:opacity-40"
                          >
                            {isPending && pendingId === t.id ? 'Working…' : 'Retire'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSetActive(t.id, true, t.task_name)}
                            disabled={isPending && pendingId === t.id}
                            className="text-sm text-green-600 hover:text-green-800 font-medium disabled:opacity-40"
                          >
                            {isPending && pendingId === t.id ? 'Working…' : 'Reactivate'}
                          </button>
                        )}
                        {!usedSet.has(t.id) && (
                          <button
                            onClick={() => handleDelete(t.id, t.task_name)}
                            disabled={isPending && pendingId === t.id}
                            className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                          >
                            {isPending && pendingId === t.id ? 'Deleting…' : 'Delete'}
                          </button>
                        )}
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
