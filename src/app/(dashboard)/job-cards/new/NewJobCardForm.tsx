'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

export default function NewJobCardForm({
  prospects,
  positions,
}: {
  prospects: { id: string; company_name: string }[]
  positions: { id: string; position_name: string }[]
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [prospectId, setProspectId] = useState('')
  const [buildingId, setBuildingId] = useState('')
  const [positionId, setPositionId] = useState('')
  const [route,      setRoute]      = useState('')
  const [buildings,  setBuildings]  = useState<{ id: string; building_name: string }[]>([])
  const [creating,   setCreating]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    if (!prospectId) { setBuildings([]); setBuildingId(''); return }
    async function load() {
      const { data } = await supabase
        .from('buildings')
        .select('id, building_name')
        .eq('prospect_id', prospectId)
        .order('building_name')
      setBuildings(data ?? [])
      setBuildingId('')
    }
    void load()
  }, [prospectId, supabase])

  async function handleCreate() {
    if (!prospectId) { setError('Please select a prospect.'); return }
    setCreating(true)
    setError(null)

    const today = new Date().toISOString().split('T')[0]
    const { data, error: err } = await supabase
      .from('job_cards')
      .insert({
        prospect_id: prospectId,
        building_id: buildingId || null,
        position_id: positionId || null,
        route:       route.trim() || null,
        revised_date: today,
      })
      .select('id')
      .single()

    if (err) { setError(err.message); setCreating(false); return }
    router.push(`/job-cards/${data.id}`)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Job Card Details</h3>

      <div>
        <label className={labelCls}>Prospect <span className="text-red-400">*</span></label>
        <select value={prospectId} onChange={e => setProspectId(e.target.value)} className={inputCls}>
          <option value="">Select prospect…</option>
          {prospects.map(p => <option key={p.id} value={p.id}>{p.company_name}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>Building <span className="text-gray-400 font-normal">(optional)</span></label>
        <select
          value={buildingId}
          onChange={e => setBuildingId(e.target.value)}
          disabled={!prospectId}
          className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <option value="">
            {!prospectId ? 'Select prospect first' : buildings.length === 0 ? 'No buildings found' : 'Select building…'}
          </option>
          {buildings.map(b => <option key={b.id} value={b.id}>{b.building_name}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>Position</label>
        <select value={positionId} onChange={e => setPositionId(e.target.value)} className={inputCls}>
          <option value="">Select position…</option>
          {positions.map(p => <option key={p.id} value={p.id}>{p.position_name}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>Route <span className="text-gray-400 font-normal">(optional)</span></label>
        <input
          type="text"
          value={route}
          onChange={e => setRoute(e.target.value)}
          placeholder="e.g. Floors 1-4, North Wing, 2nd Shift"
          maxLength={100}
          className={inputCls}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button
          onClick={handleCreate}
          disabled={!prospectId || creating}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {creating ? 'Creating…' : 'Create Job Card'}
        </button>
        <button
          onClick={() => router.back()}
          className="border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
