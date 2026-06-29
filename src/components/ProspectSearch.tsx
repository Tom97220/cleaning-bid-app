'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ProspectRow {
  prospect_id:       string
  company_name:      string
  contact_name:      string | null
  phone:             string | null
  status:            string
  building_count:    number
  matched_buildings: string[]   // populated only when a building term was used → hint line
}

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500'

export default function ProspectSearch({ onSelect }: { onSelect: (row: ProspectRow) => void }) {
  const supabase = useMemo(() => createClient(), [])
  const [companyQuery, setCompanyQuery]   = useState('')
  const [buildingQuery, setBuildingQuery] = useState('')
  const [rows, setRows]                   = useState<ProspectRow[] | null>(null)
  const [searching, setSearching]         = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  async function handleSearch() {
    const cq = companyQuery.trim()
    const bq = buildingQuery.trim()
    if (!cq && !bq) return

    setSearching(true)
    setError(null)

    try {
      // Building name is a SEARCH AID: resolve which prospects own a matching
      // building, and remember the matched building names for the hint line.
      let matchedProspectIds: string[] | null = null
      const matchedNames = new Map<string, string[]>()

      if (bq) {
        const { data: bs, error: bErr } = await supabase
          .from('buildings')
          .select('prospect_id, building_name')
          .ilike('building_name', `%${bq}%`)

        if (bErr) { setError(bErr.message); return }

        for (const b of bs ?? []) {
          if (!b.prospect_id) continue
          const arr = matchedNames.get(b.prospect_id)
          if (arr) arr.push(b.building_name)
          else matchedNames.set(b.prospect_id, [b.building_name])
        }
        matchedProspectIds = [...matchedNames.keys()]
        if (matchedProspectIds.length === 0) { setRows([]); return }
      }

      // Prospect-rooted query → one row per prospect, with embedded building count.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from('prospects')
        .select('id, company_name, contact_name, phone, status, buildings(count)')
        .order('company_name')

      if (cq)                          q = q.or(`company_name.ilike.%${cq}%,contact_name.ilike.%${cq}%`)
      if (matchedProspectIds !== null) q = q.in('id', matchedProspectIds)

      const { data, error: pErr } = await q
      if (pErr) { setError(pErr.message); return }

      setRows(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data ?? []).map((p: any) => ({
          prospect_id:       p.id,
          company_name:      p.company_name ?? '—',
          contact_name:      p.contact_name ?? null,
          phone:             p.phone ?? null,
          status:            p.status ?? 'active',
          building_count:    Array.isArray(p.buildings) ? (p.buildings[0]?.count ?? 0) : 0,
          matched_buildings: matchedNames.get(p.id) ?? [],
        })),
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
                  {['Company Name', 'Contact Name', 'Phone', 'Status', 'Buildings'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(row => (
                  <tr
                    key={row.prospect_id}
                    onClick={() => onSelect(row)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{row.company_name}</span>
                      {row.matched_buildings.length > 0 && (
                        <span className="block text-xs text-gray-400">
                          matched: {row.matched_buildings.join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.contact_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        row.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {row.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 tabular-nums">{row.building_count}</td>
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
