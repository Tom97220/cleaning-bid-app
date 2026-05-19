'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export interface JobCardRow {
  id: string
  route: string | null
  revised_date: string
  prospects: { company_name: string } | null
  buildings: { building_name: string } | null
  positions: { position_name: string } | null
}

function fmtDate(s: string) {
  return s ? new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
}

export default function JobCardsListView({
  jobCards,
  role,
}: {
  jobCards: JobCardRow[]
  role: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState(jobCards)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Delete this job card? This cannot be undone.')) return
    setDeletingId(id)
    const { error } = await supabase.from('job_cards').delete().eq('id', id)
    if (error) { alert(error.message); setDeletingId(null); return }
    setRows(prev => prev.filter(r => r.id !== id))
    setDeletingId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">
          {rows.length} job card{rows.length !== 1 ? 's' : ''}
        </p>
        <Link
          href="/job-cards/new"
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Job Card
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <svg className="w-14 h-14 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="font-medium text-gray-500">No job cards yet</p>
          <p className="text-sm mt-1">Click &ldquo;New Job Card&rdquo; to create one</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Position</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Route</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Building</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Prospect</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Revised</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {row.positions?.position_name ?? <span className="italic text-gray-400">No position</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.route ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{row.buildings?.building_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{row.prospects?.company_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums">{fmtDate(row.revised_date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/job-cards/${row.id}`}
                        className="text-xs font-medium text-brand-600 hover:text-brand-800"
                      >
                        Edit
                      </Link>
                      {role === 'admin' && (
                        <button
                          onClick={() => handleDelete(row.id)}
                          disabled={deletingId === row.id}
                          className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                        >
                          {deletingId === row.id ? 'Deleting…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
