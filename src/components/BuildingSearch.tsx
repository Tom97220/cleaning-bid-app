'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SearchRow {
  prospect_id: string
  building_id: string
  company_name: string
  contact_name: string | null
  building_name: string
  phone: string | null
  status: string
}

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500'

export default function BuildingSearch({ onSelect }: { onSelect: (row: SearchRow) => void }) {
  const supabase = useMemo(() => createClient(), [])
  const [companyQuery, setCompanyQuery]   = useState('')
  const [buildingQuery, setBuildingQuery] = useState('')
  const [rows, setRows]                   = useState<SearchRow[] | null>(null)
  const [searching, setSearching]         = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  async function handleSearch() {
    const cq = companyQuery.trim()
    const bq = buildingQuery.trim()
    if (!cq && !bq) return

    setSearching(true)
    setError(null)

    try {
      let prospectIds: string[] | null = null

      if (cq) {
        const { data: ps, error: pErr } = await supabase
          .from('prospects')
          .select('id')
          .or(`company_name.ilike.%${cq}%,contact_name.ilike.%${cq}%`)

        if (pErr) { setError(pErr.message); return }
        prospectIds = (ps ?? []).map(p => p.id)
        if (prospectIds.length === 0) { setRows([]); return }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from('buildings')
        .select('id, building_name, prospects(id, company_name, contact_name, phone, status)')
        .order('building_name')

      if (bq)                 q = q.ilike('building_name', `%${bq}%`)
      if (prospectIds !== null) q = q.in('prospect_id', prospectIds)

      const { data, error: bErr } = await q
      if (bErr) { setError(bErr.message); return }

      setRows(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data ?? []).map((b: any) => {
          const p = Array.isArray(b.prospects) ? b.prospects[0] : b.prospects
          return {
            prospect_id:   p?.id ?? '',
            building_id:   b.id,
            company_name:  p?.company_name ?? '—',
            contact_name:  p?.contact_name ?? null,
            building_name: b.building_name,
            phone:         p?.phone ?? null,
            status:        p?.status ?? 'active',
          }
        }).filter((r: SearchRow) => r.prospect_id),
      )
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const canSearch = companyQuery.trim().length > 0 || buildingQuery.trim().length > 0

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Company / Contact Name
            </label>
            <input
              type="text"
              value={companyQuery}
              onChange={e => setCompanyQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSearch) void handleSearch() }}
              placeholder="Search company or contact…"
              className={inputCls}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Building Name
            </label>
            <input
              type="text"
              value={buildingQuery}
              onChange={e => setBuildingQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSearch) void handleSearch() }}
              placeholder="Search building name…"
              className={inputCls}
            />
          </div>
          <button
            onClick={() => void handleSearch()}
            disabled={!canSearch || searching}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {rows !== null && (
        rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No record found</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Company Name', 'Contact Name', 'Building Name', 'Phone', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(row => (
                  <tr
                    key={`${row.prospect_id}-${row.building_id}`}
                    onClick={() => onSelect(row)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{row.company_name}</td>
                    <td className="px-4 py-3 text-gray-600">{row.contact_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.building_name}</td>
                    <td className="px-4 py-3 text-gray-600">{row.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        row.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {row.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
