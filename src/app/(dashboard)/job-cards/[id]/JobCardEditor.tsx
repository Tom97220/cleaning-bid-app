'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteRowType = 'task' | 'clock_in' | 'clock_out'

interface LocalRouteRow {
  localId: string
  row_type: RouteRowType
  time: string        // formatted '6:00 PM' or ''
  area_location: string
  notes: string
}

interface LocalDailyTask  { localId: string; description_en: string; description_alt: string }
interface LocalDetailTask { localId: string; description_en: string; description_alt: string }
interface LocalCoreRow    { localId: string; day_period: string; zone_area: string }

export interface JobCard {
  id: string
  prospect_id: string
  building_id: string | null
  position_id: string | null
  route: string | null
  shift_start: string | null
  shift_end: string | null
  special_instructions: string | null
  directions: string | null
  revised_date: string
  service_days: string[]
  schedule_assignments: Record<string, number>
  prospects: { company_name: string } | null
  buildings: { building_name: string } | null
  positions: { position_name: string } | null
}

interface DBRouteRow   { id: string; row_type: string; time: string | null; area_location: string | null; notes: string | null; duration: string | null }
interface DBDailyTask  { id: string; description_en: string; description_alt: string | null }
interface DBDetailRow  { id: string; day_period: string; zone_area: string | null }
interface DBWhenDetail { id: string; description_en: string; description_alt: string | null }
interface Prospect     { id: string; company_name: string }
interface Position     { id: string; position_name: string }
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

const ALL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS    = ['1','2','3','4','5','6','7','8','9','10','11','12']
const MINUTES  = ['00','15','30','45']

// ─── Styles ───────────────────────────────────────────────────────────────────

const inp = 'border border-gray-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-400'
const lbl = 'block text-xs font-medium text-gray-500 mb-0.5'
const selCls = 'border border-gray-200 rounded px-1 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-400'

// ─── TimePicker ───────────────────────────────────────────────────────────────
// Controlled: value = '6:00 PM' | '', onChange emits formatted string or ''

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const m     = value ? value.match(/^(\d+):(\d+)\s*(AM|PM)$/i) : null
  const hour   = m ? m[1] : ''
  const minute = m ? m[2] : '00'
  const ampm   = (m ? m[3].toUpperCase() : 'AM') as 'AM' | 'PM'

  function emit(h: string, min: string, ap: 'AM' | 'PM') {
    onChange(h ? `${h}:${min} ${ap}` : '')
  }

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <select
        value={hour}
        onChange={e => emit(e.target.value, minute, ampm)}
        className={`${selCls} w-11 text-center`}
      >
        <option value="">—</option>
        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-gray-400 text-xs font-bold select-none">:</span>
      <select
        value={minute}
        onChange={e => { if (hour) emit(hour, e.target.value, ampm) }}
        disabled={!hour}
        className={`${selCls} w-13 text-center disabled:opacity-40`}
      >
        {MINUTES.map(min => <option key={min} value={min}>{min}</option>)}
      </select>
      <button
        type="button"
        onClick={() => { if (hour) emit(hour, minute, ampm === 'AM' ? 'PM' : 'AM') }}
        disabled={!hour}
        className={`text-xs font-bold px-1.5 py-1 rounded border transition-colors leading-none disabled:opacity-40 disabled:cursor-not-allowed ${
          ampm === 'PM'
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
        }`}
      >
        {ampm}
      </button>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UpDownDel({ onUp, onDown, onDel, first, last }: {
  onUp: () => void; onDown: () => void; onDel: () => void; first: boolean; last: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
      <button onClick={onUp} disabled={first}
        className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed" title="Move up">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button onClick={onDown} disabled={last}
        className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed" title="Move down">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <button onClick={onDel} className="p-0.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-400" title="Delete">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function SectionHeader({ title, onAdd, addLabel }: { title: string; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">{title}</h3>
      {onAdd && addLabel && (
        <button onClick={onAdd} className="text-xs font-medium text-brand-600 hover:text-brand-800 flex items-center gap-1">
          <span className="text-base leading-none">+</span> {addLabel}
        </button>
      )}
    </div>
  )
}

// ─── Print: Page 1 (Front — Route) ───────────────────────────────────────────

function PrintFrontPage({
  positionName, route, prospectName, buildingName,
  shiftStart, shiftEnd, specialInstructions, directions, revisedDate, routeRows,
}: {
  positionName: string; route: string; prospectName: string; buildingName: string
  shiftStart: string; shiftEnd: string
  specialInstructions: string; directions: string; revisedDate: string
  routeRows: LocalRouteRow[]
}) {
  const siteLine  = [prospectName, buildingName].filter(Boolean).join(' — ')
  const titleLine = [positionName, route].filter(Boolean).join('  |  ')
  const shiftLine = [shiftStart, shiftEnd].filter(Boolean).join(' – ')

  return (
    <div>
      {/* Card header */}
      <div className="border-b-2 border-gray-800 pb-4 mb-5 flex justify-between items-start gap-8">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-gray-900 leading-tight">{titleLine || 'Job Card'}</h1>
          {siteLine && <p className="text-sm text-gray-600 mt-1">{siteLine}</p>}
          {directions && <p className="text-xs text-gray-500 mt-1">{directions}</p>}
        </div>
        <div className="text-right flex-shrink-0 text-xs text-gray-600 space-y-1 max-w-64">
          {specialInstructions && (
            <p className="whitespace-pre-wrap">
              <span className="font-semibold">Special Instructions:</span>{' '}{specialInstructions}
            </p>
          )}
          {shiftLine && <p><span className="font-semibold">Shift:</span> {shiftLine}</p>}
          <p className="text-gray-500 pt-1">Revised: {fmtDate(revisedDate)}</p>
        </div>
      </div>

      {/* Route table — 3 columns only */}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="border border-gray-300 px-2 py-1.5 text-left bg-gray-50 font-semibold text-gray-600 uppercase tracking-wide w-48">Room / Area</th>
            <th className="border border-gray-300 px-2 py-1.5 text-left bg-gray-50 font-semibold text-gray-600 uppercase tracking-wide w-20">Time</th>
            <th className="border border-gray-300 px-2 py-1.5 text-left bg-gray-50 font-semibold text-gray-600 uppercase tracking-wide">Notes</th>
          </tr>
        </thead>
        <tbody>
          {routeRows.map(row => {
            if (row.row_type !== 'task') {
              const slbl = row.row_type === 'clock_in' ? 'CLOCK IN' : 'CLOCK OUT'
              return (
                <tr key={row.localId} className="bg-gray-100">
                  <td className="border border-gray-300 px-2 py-1.5 font-bold text-gray-700 uppercase tracking-widest">
                    — {slbl} —
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-gray-600">{row.time}</td>
                  <td className="border border-gray-300 px-2 py-1.5" />
                </tr>
              )
            }
            return (
              <tr key={row.localId}>
                <td className="border border-gray-300 px-2 py-1.5">{row.area_location}</td>
                <td className="border border-gray-300 px-2 py-1.5">{row.time}</td>
                <td className="border border-gray-300 px-2 py-1.5">{row.notes}</td>
              </tr>
            )
          })}
          {/* Pad to at least 6 rows for blank routing stops */}
          {Array.from({ length: Math.max(0, 6 - routeRows.length) }).map((_, i) => (
            <tr key={`blank-${i}`}>
              <td className="border border-gray-300 px-2 py-3.5" />
              <td className="border border-gray-300 px-2 py-3.5" />
              <td className="border border-gray-300 px-2 py-3.5" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Print: Page 2/3 (Back — Tasks + Core Details + Schedule) ────────────────

function PrintBackPage({
  dailyTasks, detailTasks, coreDetails, serviceDays, scheduleAssignments, lang,
}: {
  dailyTasks: LocalDailyTask[]
  detailTasks: LocalDetailTask[]
  coreDetails: LocalCoreRow[]
  serviceDays: string[]
  scheduleAssignments: Record<string, number>
  lang: 'en' | 'alt'
}) {
  function text(en: string, alt: string) {
    return lang === 'en' ? en : (alt || en)
  }

  return (
    <div>
      {lang === 'alt' && (
        <div className="mb-4">
          <span className="inline-block text-xs bg-yellow-400 text-gray-900 font-semibold px-2 py-0.5 rounded">
            Alternate Language
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-8">
        {/* Left: Daily + Detail */}
        <div className="space-y-5">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-800 border-b-2 border-gray-800 pb-1 mb-2">Daily</p>
            {dailyTasks.length === 0 ? (
              <p className="text-xs text-gray-400 italic">None</p>
            ) : (
              <ul className="text-xs space-y-1">
                {dailyTasks.map(t => (
                  <li key={t.localId} className="flex items-start gap-1.5">
                    <span className="text-gray-500 mt-px leading-none flex-shrink-0">•</span>
                    <span>{text(t.description_en, t.description_alt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-800 border-b-2 border-gray-800 pb-1 mb-2">Detail</p>
            {detailTasks.length === 0 ? (
              <p className="text-xs text-gray-400 italic">None</p>
            ) : (
              <ul className="text-xs space-y-1">
                {detailTasks.map(t => (
                  <li key={t.localId} className="flex items-start gap-1.5">
                    <span className="text-gray-500 mt-px leading-none flex-shrink-0">•</span>
                    <span>{text(t.description_en, t.description_alt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: Core Details + Detail Schedule */}
        <div className="space-y-5">
          {coreDetails.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-800 border-b-2 border-gray-800 pb-1 mb-2">Core Details</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 px-2 py-1 text-left bg-gray-50 font-semibold text-gray-600 w-20">Core</th>
                    <th className="border border-gray-300 px-2 py-1 text-left bg-gray-50 font-semibold text-gray-600">Area / Location</th>
                  </tr>
                </thead>
                <tbody>
                  {coreDetails.map((c, idx) => (
                    <tr key={c.localId}>
                      <td className="border border-gray-300 px-2 py-1 font-medium text-gray-700">
                        {c.day_period || `Core ${idx + 1}`}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-gray-700">{c.zone_area}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {serviceDays.length > 0 && coreDetails.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-800 border-b-2 border-gray-800 pb-1 mb-2">Detail Schedule</p>
              <table className="text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 px-2 py-1 text-left bg-gray-50 font-semibold text-gray-600 w-20">Core</th>
                    {serviceDays.map(day => (
                      <th key={day} className="border border-gray-300 px-2 py-1 text-center bg-gray-50 font-semibold text-gray-600 w-12">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {coreDetails.map((c, coreIdx) => (
                    <tr key={c.localId}>
                      <td className="border border-gray-300 px-2 py-1 font-medium text-gray-700">
                        {c.day_period || `C${coreIdx + 1}`}
                      </td>
                      {serviceDays.map(day => (
                        <td key={day} className="border border-gray-300 px-2 py-1 text-center font-bold text-gray-800">
                          {scheduleAssignments[day] === coreIdx ? '✓' : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
  initialCoreDetails,
  initialDetailTasks,
  prospects,
  positions,
}: {
  jobCard: JobCard
  initialRouteRows: DBRouteRow[]
  initialDailyTasks: DBDailyTask[]
  initialCoreDetails: DBDetailRow[]
  initialDetailTasks: DBWhenDetail[]
  prospects: Prospect[]
  positions: Position[]
}) {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [hdr, setHdr] = useState({
    prospect_id:          jobCard.prospect_id,
    building_id:          jobCard.building_id          ?? '',
    position_id:          jobCard.position_id           ?? '',
    route:                jobCard.route                 ?? '',
    shift_start:          jobCard.shift_start           ?? '',
    shift_end:            jobCard.shift_end             ?? '',
    special_instructions: jobCard.special_instructions  ?? '',
    directions:           jobCard.directions            ?? '',
    revised_date:         jobCard.revised_date,
    service_days:         jobCard.service_days          ?? [] as string[],
    schedule_assignments: ((jobCard.schedule_assignments ?? {}) as unknown) as Record<string, number>,
  })

  const [routeRows,   setRouteRows]   = useState<LocalRouteRow[]>(initialRouteRows.map(r => ({
    localId: uid(), row_type: r.row_type as RouteRowType,
    time: r.time ?? '', area_location: r.area_location ?? '', notes: r.notes ?? '',
  })))

  const [dailyTasks,  setDailyTasks]  = useState<LocalDailyTask[]>(initialDailyTasks.map(t => ({
    localId: uid(), description_en: t.description_en, description_alt: t.description_alt ?? '',
  })))

  const [coreDetails, setCoreDetails] = useState<LocalCoreRow[]>(initialCoreDetails.map(r => ({
    localId: uid(), day_period: r.day_period, zone_area: r.zone_area ?? '',
  })))

  const [detailTasks, setDetailTasks] = useState<LocalDetailTask[]>(initialDetailTasks.map(t => ({
    localId: uid(), description_en: t.description_en, description_alt: t.description_alt ?? '',
  })))

  const [buildings,       setBuildings]       = useState<Building[]>([])
  const [buildingsLoaded, setBuildingsLoaded] = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [saved,           setSaved]           = useState(false)
  const [error,           setError]           = useState<string | null>(null)

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

  function setHdrField<K extends keyof typeof hdr>(field: K, value: (typeof hdr)[K]) {
    setHdr(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  function toggleDay(day: string) {
    setHdr(prev => {
      const active = prev.service_days.includes(day)
      const days = active
        ? prev.service_days.filter(d => d !== day)
        : [...prev.service_days, day].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b))
      const assignments = { ...prev.schedule_assignments }
      if (active) delete assignments[day]
      return { ...prev, service_days: days, schedule_assignments: assignments }
    })
    setSaved(false)
  }

  function setAssignment(day: string, coreIdx: number | null) {
    setHdr(prev => {
      const assignments = { ...prev.schedule_assignments }
      if (coreIdx === null) delete assignments[day]
      else assignments[day] = coreIdx
      return { ...prev, schedule_assignments: assignments }
    })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false)

    const payload = {
      prospect_id:          hdr.prospect_id,
      building_id:          hdr.building_id          || null,
      position_id:          hdr.position_id          || null,
      route:                hdr.route                || null,
      shift_start:          hdr.shift_start          || null,
      shift_end:            hdr.shift_end            || null,
      special_instructions: hdr.special_instructions || null,
      directions:           hdr.directions           || null,
      revised_date:         hdr.revised_date,
      service_days:         hdr.service_days,
      schedule_assignments: hdr.schedule_assignments,
    }

    const { error: e0 } = await supabase.from('job_cards').update(payload).eq('id', jobCard.id)
    if (e0) { setError(e0.message); setSaving(false); return }

    for (const tbl of ['job_card_route_rows', 'job_card_daily_tasks', 'job_card_detail_schedule', 'job_card_when_detailing'] as const) {
      const { error: de } = await supabase.from(tbl).delete().eq('job_card_id', jobCard.id)
      if (de) { setError(de.message); setSaving(false); return }
    }

    if (routeRows.length > 0) {
      const { error: e } = await supabase.from('job_card_route_rows').insert(
        routeRows.map((r, i) => ({
          job_card_id: jobCard.id, sort_order: i, row_type: r.row_type,
          time: r.time || null, area_location: r.area_location || null, notes: r.notes || null,
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

    if (coreDetails.length > 0) {
      const { error: e } = await supabase.from('job_card_detail_schedule').insert(
        coreDetails.map((r, i) => ({
          job_card_id: jobCard.id, sort_order: i,
          day_period: r.day_period, zone_area: r.zone_area || null,
        }))
      )
      if (e) { setError(e.message); setSaving(false); return }
    }

    if (detailTasks.length > 0) {
      const { error: e } = await supabase.from('job_card_when_detailing').insert(
        detailTasks.map((t, i) => ({
          job_card_id: jobCard.id, sort_order: i,
          description_en: t.description_en, description_alt: t.description_alt || null,
        }))
      )
      if (e) { setError(e.message); setSaving(false); return }
    }

    setSaved(true); setSaving(false)
    router.refresh()
  }

  // Print helpers
  const selectedProspect  = prospects.find(p => p.id === hdr.prospect_id)
  const selectedBuilding  = buildings.find(b => b.id === hdr.building_id)
  const selectedPosition  = positions.find(p => p.id === hdr.position_id)
  const printProspectName = selectedProspect?.company_name  ?? jobCard.prospects?.company_name  ?? ''
  const printBuildingName = selectedBuilding?.building_name ?? jobCard.buildings?.building_name ?? ''
  const printPositionName = selectedPosition?.position_name ?? jobCard.positions?.position_name ?? ''

  return (
    <>
      <style>{`
        @media print {
          .jc-editor { display: none !important; }
          .jc-print  { display: block !important; }
          .jc-page   { break-before: page; }
        }
      `}</style>

      {/* ── Print output (hidden on screen) ───────────────────────────── */}
      <div className="jc-print" style={{ display: 'none' }}>
        <div className="px-8 py-8">
          <PrintFrontPage
            positionName={printPositionName}
            route={hdr.route}
            prospectName={printProspectName}
            buildingName={printBuildingName}
            shiftStart={hdr.shift_start}
            shiftEnd={hdr.shift_end}
            specialInstructions={hdr.special_instructions}
            directions={hdr.directions}
            revisedDate={hdr.revised_date}
            routeRows={routeRows}
          />
        </div>
        <div className="jc-page px-8 py-8">
          <PrintBackPage
            dailyTasks={dailyTasks} detailTasks={detailTasks} coreDetails={coreDetails}
            serviceDays={hdr.service_days} scheduleAssignments={hdr.schedule_assignments}
            lang="en"
          />
        </div>
        <div className="jc-page px-8 py-8">
          <PrintBackPage
            dailyTasks={dailyTasks} detailTasks={detailTasks} coreDetails={coreDetails}
            serviceDays={hdr.service_days} scheduleAssignments={hdr.schedule_assignments}
            lang="alt"
          />
        </div>
      </div>

      {/* ── Editor ────────────────────────────────────────────────────── */}
      <div className="jc-editor p-6 space-y-6 max-w-4xl">

        {/* Action bar */}
        <div className="flex items-center gap-3">
          <Link href="/job-cards"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mr-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Job Cards
          </Link>
          <button onClick={handleSave} disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 border border-gray-300 hover:border-gray-400 text-gray-700 bg-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          {saved && <span className="text-sm text-green-700 font-medium">Saved.</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <SectionHeader title="Header" />
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Prospect</label>
                <select value={hdr.prospect_id} onChange={sh('prospect_id')} className={`${inp} w-full`}>
                  {prospects.map(p => <option key={p.id} value={p.id}>{p.company_name}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Building</label>
                <select value={hdr.building_id} onChange={sh('building_id')}
                  disabled={!hdr.prospect_id} className={`${inp} w-full disabled:opacity-50`}>
                  <option value="">{!buildingsLoaded ? 'Loading…' : buildings.length === 0 ? 'No buildings found' : '— None —'}</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.building_name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Position</label>
                <select value={hdr.position_id} onChange={sh('position_id')} className={`${inp} w-full`}>
                  <option value="">— Select position —</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.position_name}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Route</label>
                <input type="text" value={hdr.route} onChange={sh('route')}
                  placeholder="e.g. Floors 1-4, North Wing" maxLength={100} className={`${inp} w-full`} />
              </div>
            </div>

            {/* Shift times */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Shift Start</label>
                <TimePicker
                  value={hdr.shift_start}
                  onChange={v => setHdrField('shift_start', v)}
                />
              </div>
              <div>
                <label className={lbl}>Shift End</label>
                <TimePicker
                  value={hdr.shift_end}
                  onChange={v => setHdrField('shift_end', v)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Special Instructions</label>
                <textarea value={hdr.special_instructions} onChange={sh('special_instructions')}
                  rows={3} placeholder="Any special notes for the crew…"
                  className={`${inp} w-full resize-none`} />
              </div>
              <div>
                <label className={lbl}>Directions</label>
                <textarea value={hdr.directions} onChange={sh('directions')}
                  rows={3} placeholder="How to get to the site, parking, access codes…"
                  className={`${inp} w-full resize-none`} />
              </div>
            </div>

            <div className="w-40">
              <label className={lbl}>Revised Date</label>
              <input type="date" value={hdr.revised_date} onChange={sh('revised_date')} className={`${inp} w-full`} />
            </div>
          </div>
        </div>

        {/* ── Route ──────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <SectionHeader title="Route" onAdd={() => setRouteRows(prev => [
            ...prev, { localId: uid(), row_type: 'task', time: '', area_location: '', notes: '' }
          ])} addLabel="Add Row" />

          <div className="px-5 py-4 space-y-2">
            {routeRows.length === 0 && (
              <p className="text-sm text-gray-400 italic py-2">No route rows yet.</p>
            )}
            {routeRows.map((row, i) => (
              <div key={row.localId}
                className={`flex items-center gap-3 p-3 rounded-lg ${row.row_type !== 'task' ? 'bg-gray-50' : ''}`}>
                <UpDownDel
                  onUp={() => setRouteRows(p => moveUp(p, i))}
                  onDown={() => setRouteRows(p => moveDown(p, i))}
                  onDel={() => setRouteRows(p => removeAt(p, i))}
                  first={i === 0} last={i === routeRows.length - 1}
                />
                {row.row_type !== 'task' ? (
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-600 w-24 flex-shrink-0">
                      {row.row_type === 'clock_in' ? 'CLOCK IN' : 'CLOCK OUT'}
                    </span>
                    <TimePicker
                      value={row.time}
                      onChange={v => setRouteRows(p => p.map((r, x) => x === i ? { ...r, time: v } : r))}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <label className={lbl}>Room / Area</label>
                      <input type="text" value={row.area_location}
                        onChange={e => setRouteRows(p => p.map((r, x) => x === i ? { ...r, area_location: e.target.value } : r))}
                        placeholder="Room or area" maxLength={50} className={`${inp} w-full`} />
                    </div>
                    <div className="flex-shrink-0">
                      <label className={lbl}>Time</label>
                      <TimePicker
                        value={row.time}
                        onChange={v => setRouteRows(p => p.map((r, x) => x === i ? { ...r, time: v } : r))}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className={lbl}>Notes</label>
                      <input type="text" value={row.notes}
                        onChange={e => setRouteRows(p => p.map((r, x) => x === i ? { ...r, notes: e.target.value } : r))}
                        placeholder="Free text notes" maxLength={100} className={`${inp} w-full`} />
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {(['clock_in', 'clock_out'] as RouteRowType[]).map(type => (
                <button key={type}
                  onClick={() => setRouteRows(prev => [...prev, {
                    localId: uid(), row_type: type, time: '', area_location: '', notes: '',
                  }])}
                  className="text-xs font-medium text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-3 py-1 rounded-full transition-colors">
                  + {type === 'clock_in' ? 'CLOCK IN' : 'CLOCK OUT'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Daily Tasks ─────────────────────────────────────────────── */}
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

        {/* ── Detail Tasks ────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <SectionHeader title="Detail Tasks" onAdd={() => setDetailTasks(p => [
            ...p, { localId: uid(), description_en: '', description_alt: '' }
          ])} addLabel="Add Task" />
          <div className="px-5 pb-3 pt-1">
            <p className="text-xs text-gray-400 italic">Include frequency in parentheses, e.g. &ldquo;Shampoo carpets (2x/month)&rdquo;</p>
          </div>

          <div className="px-5 py-2 space-y-2">
            {detailTasks.length === 0 && (
              <p className="text-sm text-gray-400 italic py-2">No detail tasks yet.</p>
            )}
            {detailTasks.map((t, i) => (
              <div key={t.localId} className="flex items-start gap-3">
                <UpDownDel
                  onUp={() => setDetailTasks(p => moveUp(p, i))}
                  onDown={() => setDetailTasks(p => moveDown(p, i))}
                  onDel={() => setDetailTasks(p => removeAt(p, i))}
                  first={i === 0} last={i === detailTasks.length - 1}
                />
                <div className="flex gap-2 flex-1 min-w-0">
                  <div className="flex-1">
                    <label className={lbl}>English</label>
                    <input type="text" value={t.description_en}
                      onChange={e => setDetailTasks(p => p.map((x, j) => j === i ? { ...x, description_en: e.target.value } : x))}
                      maxLength={150} placeholder="Strip &amp; wax floors (monthly)" className={`${inp} w-full`} />
                  </div>
                  <div className="flex-1">
                    <label className={lbl}>Alternate Language</label>
                    <input type="text" value={t.description_alt}
                      onChange={e => setDetailTasks(p => p.map((x, j) => j === i ? { ...x, description_alt: e.target.value } : x))}
                      maxLength={150} placeholder="Translation" className={`${inp} w-full`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Service Schedule ────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <SectionHeader title="Service Schedule" />
          <div className="px-5 py-5 space-y-6">

            {/* Service Days */}
            <div>
              <p className={`${lbl} mb-2`}>Service Days</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_DAYS.map(day => {
                  const active = hdr.service_days.includes(day)
                  return (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Core Details */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className={lbl}>Core Details</p>
                <button onClick={() => setCoreDetails(p => [
                  ...p, { localId: uid(), day_period: `Core ${p.length + 1}`, zone_area: '' }
                ])} className="text-xs font-medium text-brand-600 hover:text-brand-800 flex items-center gap-1">
                  <span className="text-base leading-none">+</span> Add Core
                </button>
              </div>

              {coreDetails.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No cores defined yet.</p>
              ) : (
                <div className="space-y-2">
                  {coreDetails.map((r, i) => (
                    <div key={r.localId} className="flex items-center gap-3">
                      <UpDownDel
                        onUp={() => setCoreDetails(p => moveUp(p, i))}
                        onDown={() => setCoreDetails(p => moveDown(p, i))}
                        onDel={() => {
                          setCoreDetails(p => removeAt(p, i))
                          setHdr(prev => {
                            const assignments: Record<string, number> = {}
                            for (const [day, idx] of Object.entries(prev.schedule_assignments)) {
                              if (idx < i) assignments[day] = idx
                              else if (idx > i) assignments[day] = idx - 1
                            }
                            return { ...prev, schedule_assignments: assignments }
                          })
                        }}
                        first={i === 0} last={i === coreDetails.length - 1}
                      />
                      <div className="w-28 flex-shrink-0">
                        <input type="text" value={r.day_period}
                          onChange={e => setCoreDetails(p => p.map((x, j) => j === i ? { ...x, day_period: e.target.value } : x))}
                          placeholder={`Core ${i + 1}`} maxLength={30} className={`${inp} w-full`} />
                      </div>
                      <div className="flex-1">
                        <input type="text" value={r.zone_area}
                          onChange={e => setCoreDetails(p => p.map((x, j) => j === i ? { ...x, zone_area: e.target.value } : x))}
                          placeholder="Area / Location" maxLength={50} className={`${inp} w-full`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule Grid */}
            {hdr.service_days.length > 0 && coreDetails.length > 0 && (
              <div>
                <p className={`${lbl} mb-2`}>Detail Schedule — assign one core per service day</p>
                <div className="overflow-x-auto">
                  <table className="text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="border border-gray-200 px-3 py-1.5 text-left text-gray-600 font-semibold bg-gray-50 w-32">Core</th>
                        {hdr.service_days.map(day => (
                          <th key={day} className="border border-gray-200 px-3 py-1.5 text-center text-gray-600 font-semibold bg-gray-50 w-14">{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {coreDetails.map((core, coreIdx) => (
                        <tr key={core.localId}>
                          <td className="border border-gray-200 px-3 py-1.5 text-gray-700 font-medium">
                            {core.day_period || `Core ${coreIdx + 1}`}
                          </td>
                          {hdr.service_days.map(day => {
                            const assigned = hdr.schedule_assignments[day] === coreIdx
                            return (
                              <td key={day} className="border border-gray-200 px-3 py-1.5 text-center">
                                <button type="button"
                                  onClick={() => setAssignment(day, assigned ? null : coreIdx)}
                                  className={`w-5 h-5 rounded-full border-2 transition-colors mx-auto block ${
                                    assigned
                                      ? 'bg-brand-600 border-brand-600'
                                      : 'bg-white border-gray-300 hover:border-brand-400'
                                  }`}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom save */}
        <div className="flex items-center gap-3 pb-6">
          <button onClick={handleSave} disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && <span className="text-sm text-green-700 font-medium">Saved.</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>
    </>
  )
}
