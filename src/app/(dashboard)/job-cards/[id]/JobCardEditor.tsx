'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteRowType = 'task' | 'start_shift' | 'end_shift' | 'am_break' | 'lunch' | 'pm_break'

interface LocalRouteRow   { localId: string; row_type: RouteRowType; time: string; area_location: string; notes: string; duration: string }
interface LocalDailyTask  { localId: string; description_en: string; description_alt: string }
interface LocalDetailRow  { localId: string; day_period: string; zone_area: string }
interface LocalWhenDetail { localId: string; description_en: string; description_alt: string }

export interface JobCard {
  id: string
  prospect_id: string
  building_id: string | null
  position_title: string
  shift_start: string | null
  shift_end: string | null
  team: string | null
  special_instructions: string | null
  directions: string | null
  revised_date: string
  prospects: { company_name: string } | null
  buildings: { building_name: string } | null
}

interface DBRouteRow   { id: string; row_type: string; time: string | null; area_location: string | null; notes: string | null; duration: string | null }
interface DBDailyTask  { id: string; description_en: string; description_alt: string | null }
interface DBDetailRow  { id: string; day_period: string; zone_area: string | null }
interface DBWhenDetail { id: string; description_en: string; description_alt: string | null }
interface Prospect     { id: string; company_name: string }
interface Building     { id: string; building_name: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _idSeq = 0
const uid = () => `_${++_idSeq}`

function moveUp<T>(arr: T[], i: number): T[] {
  if (i === 0) return arr
  const n = [...arr]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n
}
function moveDown<T>(arr: T[], i: number): T[] {
  if (i === arr.length - 1) return arr
  const n = [...arr]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; return n
}
function removeAt<T>(arr: T[], i: number): T[] { return arr.filter((_, x) => x !== i) }

function fmtDate(s: string) {
  return s ? new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''
}

const SPECIAL_TYPES: { type: RouteRowType; label: string; hasDuration: boolean }[] = [
  { type: 'start_shift', label: 'START SHIFT',  hasDuration: false },
  { type: 'end_shift',   label: 'END SHIFT',    hasDuration: false },
  { type: 'am_break',    label: 'AM BREAK',     hasDuration: true  },
  { type: 'lunch',       label: 'LUNCH',        hasDuration: true  },
  { type: 'pm_break',    label: 'PM BREAK',     hasDuration: true  },
]

function specialLabel(type: RouteRowType): string {
  return SPECIAL_TYPES.find(s => s.type === type)?.label ?? ''
}

function hasDuration(type: RouteRowType): boolean {
  return SPECIAL_TYPES.find(s => s.type === type)?.hasDuration ?? false
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inp = 'border border-gray-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-400'
const lbl = 'block text-xs font-medium text-gray-500 mb-0.5'

function UpDownDel({ onUp, onDown, onDel, first, last }: {
  onUp: () => void; onDown: () => void; onDel: () => void; first: boolean; last: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
      <button onClick={onUp}  disabled={first} className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed" title="Move up">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
      </button>
      <button onClick={onDown} disabled={last}  className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed" title="Move down">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      <button onClick={onDel} className="p-0.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-400" title="Delete">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  )
}

function SectionHeader({ title, onAdd, addLabel }: { title: string; onAdd: () => void; addLabel: string }) {
  return (
    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">{title}</h3>
      <button onClick={onAdd}
        className="text-xs font-medium text-brand-600 hover:text-brand-800 flex items-center gap-1">
        <span className="text-base leading-none">+</span> {addLabel}
      </button>
    </div>
  )
}

// ─── Print View ───────────────────────────────────────────────────────────────

function PrintJobCardPage({
  header,
  prospectName,
  buildingName,
  routeRows,
  dailyTasks,
  detailSchedule,
  whenDetailing,
  lang,
}: {
  header: {
    position_title: string; shift_start: string; shift_end: string; team: string
    special_instructions: string; directions: string; revised_date: string
  }
  prospectName: string
  buildingName: string
  routeRows: LocalRouteRow[]
  dailyTasks: LocalDailyTask[]
  detailSchedule: LocalDetailRow[]
  whenDetailing: LocalWhenDetail[]
  lang: 'en' | 'alt'
}) {
  const shiftLine = [header.shift_start, header.shift_end].filter(Boolean).join(' – ')

  return (
    <div>
      {/* Header band */}
      <div className="bg-gray-800 text-white px-8 py-6">
        <div className="flex justify-between items-start gap-8">
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight truncate">{header.position_title || 'Job Card'}</h1>
            {(prospectName || buildingName) && (
              <p className="text-gray-300 text-sm mt-0.5">
                {[prospectName, buildingName].filter(Boolean).join(' — ')}
              </p>
            )}
            {lang === 'alt' && (
              <span className="inline-block mt-2 text-xs bg-yellow-400 text-gray-900 font-semibold px-2 py-0.5 rounded">
                Alternate Language
              </span>
            )}
          </div>
          <div className="text-right text-xs text-gray-300 space-y-0.5 flex-shrink-0">
            <p>Revised: {fmtDate(header.revised_date)}</p>
            {shiftLine   && <p>Shift: {shiftLine}</p>}
            {header.team && <p>Team: {header.team}</p>}
          </div>
        </div>
        {(header.special_instructions || header.directions) && (
          <div className="mt-4 pt-4 border-t border-gray-600 text-xs space-y-1">
            {header.special_instructions && (
              <p><span className="font-semibold">Special Instructions:</span> {header.special_instructions}</p>
            )}
            {header.directions && (
              <p><span className="font-semibold">Directions:</span> {header.directions}</p>
            )}
          </div>
        )}
      </div>

      {/* Route table */}
      {routeRows.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">Route</p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-gray-300 px-2 py-1.5 text-left bg-gray-50 font-semibold text-gray-600 uppercase tracking-wide w-16">Time</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left bg-gray-50 font-semibold text-gray-600 uppercase tracking-wide w-48">Area / Location</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left bg-gray-50 font-semibold text-gray-600 uppercase tracking-wide">Notes</th>
              </tr>
            </thead>
            <tbody>
              {routeRows.map(row => {
                if (row.row_type !== 'task') {
                  const slbl = specialLabel(row.row_type)
                  const txt = row.duration ? `${slbl}  (${row.duration})` : slbl
                  return (
                    <tr key={row.localId} className="bg-gray-100">
                      <td className="border border-gray-300 px-2 py-1 text-gray-500">{row.time}</td>
                      <td colSpan={2} className="border border-gray-300 px-2 py-1 text-center font-semibold text-gray-600 tracking-widest uppercase">
                        — {txt} —
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={row.localId}>
                    <td className="border border-gray-300 px-2 py-1">{row.time}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.area_location}</td>
                    <td className="border border-gray-300 px-2 py-1">{row.notes}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Two-column bottom */}
      <div className="mt-5 grid grid-cols-2 gap-8">
        {/* Left: Daily Tasks */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">Daily Tasks</p>
          {dailyTasks.length === 0 ? (
            <p className="text-xs text-gray-400 italic">None</p>
          ) : (
            <ul className="text-xs space-y-1">
              {dailyTasks.map(t => {
                const text = lang === 'en' ? t.description_en : (t.description_alt || t.description_en)
                return (
                  <li key={t.localId} className="flex items-start gap-1.5">
                    <span className="text-gray-400 mt-px leading-none">•</span>
                    <span>{text}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Right: Detail Schedule + When Detailing */}
        <div className="space-y-5">
          {detailSchedule.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">Detail Schedule</p>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-gray-100">
                  {detailSchedule.map(r => (
                    <tr key={r.localId}>
                      <td className="py-0.5 pr-3 text-gray-600 w-28">{r.day_period}</td>
                      <td className="py-0.5 font-medium text-gray-800">{r.zone_area}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {whenDetailing.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">When Detailing</p>
              <ul className="text-xs space-y-1">
                {whenDetailing.map(t => {
                  const text = lang === 'en' ? t.description_en : (t.description_alt || t.description_en)
                  return (
                    <li key={t.localId} className="flex items-start gap-1.5">
                      <span className="text-gray-400 mt-px leading-none">•</span>
                      <span>{text}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JobCardEditor({
  jobCard,
  initialRouteRows,
  initialDailyTasks,
  initialDetailSchedule,
  initialWhenDetailing,
  prospects,
}: {
  jobCard: JobCard
  initialRouteRows: DBRouteRow[]
  initialDailyTasks: DBDailyTask[]
  initialDetailSchedule: DBDetailRow[]
  initialWhenDetailing: DBWhenDetail[]
  prospects: Prospect[]
}) {
  const router  = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Header
  const [hdr, setHdr] = useState({
    prospect_id:          jobCard.prospect_id,
    building_id:          jobCard.building_id          ?? '',
    position_title:       jobCard.position_title        ?? '',
    shift_start:          jobCard.shift_start           ?? '',
    shift_end:            jobCard.shift_end             ?? '',
    team:                 jobCard.team                  ?? '',
    special_instructions: jobCard.special_instructions  ?? '',
    directions:           jobCard.directions            ?? '',
    revised_date:         jobCard.revised_date,
  })

  const [routeRows,      setRouteRows]      = useState<LocalRouteRow[]>(initialRouteRows.map(r => ({
    localId: uid(), row_type: r.row_type as RouteRowType,
    time: r.time ?? '', area_location: r.area_location ?? '', notes: r.notes ?? '', duration: r.duration ?? '',
  })))

  const [dailyTasks,     setDailyTasks]     = useState<LocalDailyTask[]>(initialDailyTasks.map(t => ({
    localId: uid(), description_en: t.description_en, description_alt: t.description_alt ?? '',
  })))

  const [detailSchedule, setDetailSchedule] = useState<LocalDetailRow[]>(initialDetailSchedule.map(r => ({
    localId: uid(), day_period: r.day_period, zone_area: r.zone_area ?? '',
  })))

  const [whenDetailing,  setWhenDetailing]  = useState<LocalWhenDetail[]>(initialWhenDetailing.map(t => ({
    localId: uid(), description_en: t.description_en, description_alt: t.description_alt ?? '',
  })))

  const [buildings,       setBuildings]       = useState<Building[]>([])
  const [buildingsLoaded, setBuildingsLoaded] = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!hdr.prospect_id) { setBuildings([]); setBuildingsLoaded(true); return }
    setBuildingsLoaded(false)
    async function load() {
      const { data } = await supabase
        .from('buildings').select('id, building_name')
        .eq('prospect_id', hdr.prospect_id).order('building_name')
      setBuildings(data ?? [])
      setBuildingsLoaded(true)
    }
    void load()
  }, [hdr.prospect_id, supabase])

  function sh(field: keyof typeof hdr) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setHdr(prev => ({ ...prev, [field]: e.target.value }))
      setSaved(false)
    }
  }

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false)

    const payload = {
      prospect_id:          hdr.prospect_id,
      building_id:          hdr.building_id || null,
      position_title:       hdr.position_title,
      shift_start:          hdr.shift_start          || null,
      shift_end:            hdr.shift_end            || null,
      team:                 hdr.team                 || null,
      special_instructions: hdr.special_instructions || null,
      directions:           hdr.directions           || null,
      revised_date:         hdr.revised_date,
    }

    const { error: e0 } = await supabase.from('job_cards').update(payload).eq('id', jobCard.id)
    if (e0) { setError(e0.message); setSaving(false); return }

    // Clear child records then reinsert
    for (const tbl of ['job_card_route_rows', 'job_card_daily_tasks', 'job_card_detail_schedule', 'job_card_when_detailing'] as const) {
      const { error: de } = await supabase.from(tbl).delete().eq('job_card_id', jobCard.id)
      if (de) { setError(de.message); setSaving(false); return }
    }

    if (routeRows.length > 0) {
      const { error: e } = await supabase.from('job_card_route_rows').insert(
        routeRows.map((r, i) => ({
          job_card_id: jobCard.id, sort_order: i,
          row_type: r.row_type, time: r.time || null,
          area_location: r.area_location || null, notes: r.notes || null, duration: r.duration || null,
        }))
      )
      if (e) { setError(e.message); setSaving(false); return }
    }

    if (dailyTasks.length > 0) {
      const { error: e } = await supabase.from('job_card_daily_tasks').insert(
        dailyTasks.map((t, i) => ({
          job_card_id: jobCard.id, sort_order: i,
          description_en: t.description_en, description_alt: t.description_alt || null,
        }))
      )
      if (e) { setError(e.message); setSaving(false); return }
    }

    if (detailSchedule.length > 0) {
      const { error: e } = await supabase.from('job_card_detail_schedule').insert(
        detailSchedule.map((r, i) => ({
          job_card_id: jobCard.id, sort_order: i,
          day_period: r.day_period, zone_area: r.zone_area || null,
        }))
      )
      if (e) { setError(e.message); setSaving(false); return }
    }

    if (whenDetailing.length > 0) {
      const { error: e } = await supabase.from('job_card_when_detailing').insert(
        whenDetailing.map((t, i) => ({
          job_card_id: jobCard.id, sort_order: i,
          description_en: t.description_en, description_alt: t.description_alt || null,
        }))
      )
      if (e) { setError(e.message); setSaving(false); return }
    }

    setSaved(true); setSaving(false)
    router.refresh()
  }

  // Print data helpers
  const selectedProspect = prospects.find(p => p.id === hdr.prospect_id)
  const selectedBuilding = buildings.find(b => b.id === hdr.building_id)
  const printHdr = {
    position_title: hdr.position_title, shift_start: hdr.shift_start, shift_end: hdr.shift_end,
    team: hdr.team, special_instructions: hdr.special_instructions,
    directions: hdr.directions, revised_date: hdr.revised_date,
  }

  return (
    <>
      <style>{`
        @media print {
          .jc-editor  { display: none !important; }
          .jc-print   { display: block !important; }
          .jc-p2      { break-before: page; }
        }
      `}</style>

      {/* ── Print output (hidden on screen) ───────────────────────────────── */}
      <div className="jc-print" style={{ display: 'none' }}>
        <div className="px-8 py-8">
          <PrintJobCardPage
            header={printHdr}
            prospectName={selectedProspect?.company_name ?? jobCard.prospects?.company_name ?? ''}
            buildingName={selectedBuilding?.building_name ?? jobCard.buildings?.building_name ?? ''}
            routeRows={routeRows}
            dailyTasks={dailyTasks}
            detailSchedule={detailSchedule}
            whenDetailing={whenDetailing}
            lang="en"
          />
        </div>
        <div className="jc-p2 px-8 py-8">
          <PrintJobCardPage
            header={printHdr}
            prospectName={selectedProspect?.company_name ?? jobCard.prospects?.company_name ?? ''}
            buildingName={selectedBuilding?.building_name ?? jobCard.buildings?.building_name ?? ''}
            routeRows={routeRows}
            dailyTasks={dailyTasks}
            detailSchedule={detailSchedule}
            whenDetailing={whenDetailing}
            lang="alt"
          />
        </div>
      </div>

      {/* ── Editor (hidden on print) ───────────────────────────────────────── */}
      <div className="jc-editor p-6 space-y-6 max-w-4xl">

        {/* Action bar */}
        <div className="flex items-center gap-3">
          <Link
            href="/job-cards"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mr-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Job Cards
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 border border-gray-300 hover:border-gray-400 text-gray-700 bg-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          {saved  && <span className="text-sm text-green-700 font-medium">Saved.</span>}
          {error  && <span className="text-sm text-red-600">{error}</span>}
        </div>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Header</h3>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Prospect</label>
                <select value={hdr.prospect_id} onChange={sh('prospect_id')}
                  className={`${inp} w-full`}>
                  {prospects.map(p => <option key={p.id} value={p.id}>{p.company_name}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Building</label>
                <select value={hdr.building_id} onChange={sh('building_id')}
                  disabled={!hdr.prospect_id}
                  className={`${inp} w-full disabled:opacity-50`}>
                  <option value="">{!buildingsLoaded ? 'Loading…' : buildings.length === 0 ? 'No buildings found' : '— None —'}</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.building_name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Position Title</label>
                <input type="text" value={hdr.position_title} onChange={sh('position_title')}
                  maxLength={50} placeholder="e.g. Day Porter" className={`${inp} w-full`} />
              </div>
              <div>
                <label className={lbl}>Team</label>
                <input type="text" value={hdr.team} onChange={sh('team')}
                  maxLength={20} placeholder="Team name" className={`${inp} w-full`} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={lbl}>Shift Start</label>
                <input type="text" value={hdr.shift_start} onChange={sh('shift_start')}
                  placeholder="7:00 AM" className={`${inp} w-full`} />
              </div>
              <div>
                <label className={lbl}>Shift End</label>
                <input type="text" value={hdr.shift_end} onChange={sh('shift_end')}
                  placeholder="3:30 PM" className={`${inp} w-full`} />
              </div>
              <div>
                <label className={lbl}>Revised Date</label>
                <input type="date" value={hdr.revised_date} onChange={sh('revised_date')}
                  className={`${inp} w-full`} />
              </div>
            </div>

            <div>
              <label className={lbl}>Special Instructions</label>
              <textarea value={hdr.special_instructions} onChange={sh('special_instructions')}
                rows={2} placeholder="Any special notes for the crew…"
                className={`${inp} w-full resize-none`} />
            </div>

            <div>
              <label className={lbl}>Directions</label>
              <textarea value={hdr.directions} onChange={sh('directions')}
                rows={2} placeholder="How to get to the site, parking, access codes…"
                className={`${inp} w-full resize-none`} />
            </div>
          </div>
        </div>

        {/* ── Route ──────────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <SectionHeader title="Route" onAdd={() => setRouteRows(prev => [...prev, {
            localId: uid(), row_type: 'task', time: '', area_location: '', notes: '', duration: '',
          }])} addLabel="Add Task Row" />

          <div className="px-5 py-4 space-y-2">
            {routeRows.length === 0 && (
              <p className="text-sm text-gray-400 italic py-2">No route rows yet.</p>
            )}
            {routeRows.map((row, i) => (
              <div key={row.localId} className={`flex items-start gap-3 p-3 rounded-lg ${row.row_type !== 'task' ? 'bg-gray-50' : ''}`}>
                <UpDownDel
                  onUp={() => setRouteRows(p => moveUp(p, i))}
                  onDown={() => setRouteRows(p => moveDown(p, i))}
                  onDel={() => setRouteRows(p => removeAt(p, i))}
                  first={i === 0} last={i === routeRows.length - 1}
                />
                {row.row_type === 'task' ? (
                  <div className="flex gap-2 flex-1 min-w-0">
                    <div className="w-20 flex-shrink-0">
                      <input type="text" value={row.time}
                        onChange={e => setRouteRows(p => p.map((r, x) => x === i ? { ...r, time: e.target.value } : r))}
                        placeholder="7:00" maxLength={10} className={`${inp} w-full`} />
                    </div>
                    <div className="w-44 flex-shrink-0">
                      <input type="text" value={row.area_location}
                        onChange={e => setRouteRows(p => p.map((r, x) => x === i ? { ...r, area_location: e.target.value } : r))}
                        placeholder="Area / Location" maxLength={50} className={`${inp} w-full`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <input type="text" value={row.notes}
                        onChange={e => setRouteRows(p => p.map((r, x) => x === i ? { ...r, notes: e.target.value } : r))}
                        placeholder="Notes" maxLength={100} className={`${inp} w-full`} />
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 flex-1 items-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500 w-28 flex-shrink-0">
                      {specialLabel(row.row_type)}
                    </span>
                    <div className="w-20 flex-shrink-0">
                      <input type="text" value={row.time}
                        onChange={e => setRouteRows(p => p.map((r, x) => x === i ? { ...r, time: e.target.value } : r))}
                        placeholder="Time" maxLength={10} className={`${inp} w-full`} />
                    </div>
                    {hasDuration(row.row_type) && (
                      <div className="w-24 flex-shrink-0">
                        <input type="text" value={row.duration}
                          onChange={e => setRouteRows(p => p.map((r, x) => x === i ? { ...r, duration: e.target.value } : r))}
                          placeholder="Duration" maxLength={20} className={`${inp} w-full`} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Special row buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {SPECIAL_TYPES.map(s => (
                <button key={s.type}
                  onClick={() => setRouteRows(prev => [...prev, {
                    localId: uid(), row_type: s.type, time: '', area_location: '', notes: '', duration: '',
                  }])}
                  className="text-xs font-medium text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-3 py-1 rounded-full transition-colors"
                >
                  + {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Daily Tasks ─────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <SectionHeader title="Daily Tasks" onAdd={() => setDailyTasks(p => [
            ...p, { localId: uid(), description_en: '', description_alt: '' }
          ])} addLabel="Add Task" />

          <div className="px-5 py-4 space-y-2">
            {dailyTasks.length === 0 && (
              <p className="text-sm text-gray-400 italic py-2">No daily tasks yet.</p>
            )}
            {dailyTasks.map((t, i) => (
              <div key={t.localId} className="flex items-start gap-3">
                <UpDownDel
                  onUp={() => setDailyTasks(p => moveUp(p, i))}
                  onDown={() => setDailyTasks(p => moveDown(p, i))}
                  onDel={() => setDailyTasks(p => removeAt(p, i))}
                  first={i === 0} last={i === dailyTasks.length - 1}
                />
                <div className="flex gap-2 flex-1 min-w-0">
                  <div className="flex-1">
                    <label className={lbl}>English</label>
                    <input type="text" value={t.description_en}
                      onChange={e => setDailyTasks(p => p.map((x, j) => j === i ? { ...x, description_en: e.target.value } : x))}
                      maxLength={150} placeholder="Task description" className={`${inp} w-full`} />
                  </div>
                  <div className="flex-1">
                    <label className={lbl}>Alternate Language</label>
                    <input type="text" value={t.description_alt}
                      onChange={e => setDailyTasks(p => p.map((x, j) => j === i ? { ...x, description_alt: e.target.value } : x))}
                      maxLength={150} placeholder="Translation" className={`${inp} w-full`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Detail Schedule ─────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <SectionHeader title="Detail Schedule" onAdd={() => setDetailSchedule(p => [
            ...p, { localId: uid(), day_period: '', zone_area: '' }
          ])} addLabel="Add Row" />

          <div className="px-5 py-4 space-y-2">
            {detailSchedule.length === 0 && (
              <p className="text-sm text-gray-400 italic py-2">No detail schedule rows yet.</p>
            )}
            {detailSchedule.map((r, i) => (
              <div key={r.localId} className="flex items-start gap-3">
                <UpDownDel
                  onUp={() => setDetailSchedule(p => moveUp(p, i))}
                  onDown={() => setDetailSchedule(p => moveDown(p, i))}
                  onDel={() => setDetailSchedule(p => removeAt(p, i))}
                  first={i === 0} last={i === detailSchedule.length - 1}
                />
                <div className="flex gap-2 flex-1 min-w-0">
                  <div className="w-40 flex-shrink-0">
                    <label className={lbl}>Day / Period</label>
                    <input type="text" value={r.day_period}
                      onChange={e => setDetailSchedule(p => p.map((x, j) => j === i ? { ...x, day_period: e.target.value } : x))}
                      maxLength={30} placeholder="e.g. Monday, 1st Friday" className={`${inp} w-full`} />
                  </div>
                  <div className="flex-1">
                    <label className={lbl}>Zone / Area</label>
                    <input type="text" value={r.zone_area}
                      onChange={e => setDetailSchedule(p => p.map((x, j) => j === i ? { ...x, zone_area: e.target.value } : x))}
                      maxLength={50} placeholder="Zone or area name" className={`${inp} w-full`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── When Detailing ──────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <SectionHeader title="When Detailing" onAdd={() => setWhenDetailing(p => [
            ...p, { localId: uid(), description_en: '', description_alt: '' }
          ])} addLabel="Add Task" />

          <div className="px-5 py-4 space-y-2">
            {whenDetailing.length === 0 && (
              <p className="text-sm text-gray-400 italic py-2">No detailing tasks yet.</p>
            )}
            {whenDetailing.map((t, i) => (
              <div key={t.localId} className="flex items-start gap-3">
                <UpDownDel
                  onUp={() => setWhenDetailing(p => moveUp(p, i))}
                  onDown={() => setWhenDetailing(p => moveDown(p, i))}
                  onDel={() => setWhenDetailing(p => removeAt(p, i))}
                  first={i === 0} last={i === whenDetailing.length - 1}
                />
                <div className="flex gap-2 flex-1 min-w-0">
                  <div className="flex-1">
                    <label className={lbl}>English</label>
                    <input type="text" value={t.description_en}
                      onChange={e => setWhenDetailing(p => p.map((x, j) => j === i ? { ...x, description_en: e.target.value } : x))}
                      maxLength={150} placeholder="Task description" className={`${inp} w-full`} />
                  </div>
                  <div className="flex-1">
                    <label className={lbl}>Alternate Language</label>
                    <input type="text" value={t.description_alt}
                      onChange={e => setWhenDetailing(p => p.map((x, j) => j === i ? { ...x, description_alt: e.target.value } : x))}
                      maxLength={150} placeholder="Translation" className={`${inp} w-full`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom save */}
        <div className="flex items-center gap-3 pb-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && <span className="text-sm text-green-700 font-medium">Saved.</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>
    </>
  )
}
