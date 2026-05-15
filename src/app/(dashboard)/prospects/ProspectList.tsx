'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { deleteProspect } from './actions'
import type { Prospect } from '@/types/prospect'

const TYPE_LABELS: Record<string, string> = {
  commercial:  'Commercial',
  industrial:  'Industrial',
  medical:     'Medical',
  educational: 'Educational',
}

const TYPE_COLORS: Record<string, string> = {
  commercial:  'bg-blue-50 text-blue-700',
  industrial:  'bg-orange-50 text-orange-700',
  medical:     'bg-red-50 text-red-700',
  educational: 'bg-purple-50 text-purple-700',
}

export default function ProspectList({ prospects }: { prospects: Prospect[] }) {
  const [search, setSearch]           = useState('')
  const [typeFilter, setTypeFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  const filtered = prospects.filter((p) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      p.company_name.toLowerCase().includes(q) ||
      (p.contact_name?.toLowerCase().includes(q) ?? false)
    const matchesType   = !typeFilter   || p.prospect_type === typeFilter
    const matchesStatus = !statusFilter || p.status        === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    startTransition(async () => {
      await deleteProspect(id)
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by company or contact..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[240px] max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Types</option>
          <option value="commercial">Commercial</option>
          <option value="industrial">Industrial</option>
          <option value="medical">Medical</option>
          <option value="educational">Educational</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="text-sm text-gray-400 ml-auto">
          {filtered.length} of {prospects.length} prospects
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Company', 'Contact', 'Phone', 'Email', 'Type', 'Status', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <p className="text-sm font-medium text-gray-400">
                    {prospects.length === 0
                      ? 'No prospects yet — click "+ New Prospect" to add one.'
                      : 'No prospects match your filters.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{p.company_name}</div>
                    {p.city && (
                      <div className="text-xs text-gray-400">
                        {p.city}{p.state ? `, ${p.state}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-700">{p.contact_name ?? '—'}</div>
                    {p.contact_title && (
                      <div className="text-xs text-gray-400">{p.contact_title}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    {p.prospect_type ? (
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[p.prospect_type]}`}>
                        {TYPE_LABELS[p.prospect_type]}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      p.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/prospects/${p.id}/edit`}
                        className="text-sm text-brand-600 hover:text-brand-800 font-medium"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id, p.company_name)}
                        disabled={isPending && deletingId === p.id}
                        className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                      >
                        {isPending && deletingId === p.id ? 'Deleting…' : 'Delete'}
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
