'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sortRouteRows } from '@/lib/sortRouteRows'

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteRowType = 'task' | 'clock_in' | 'clock_out'

interface LocalRouteRow {
  localId: string
  row_type: RouteRowType
  time: string
  area_location: string
  notes: string
  notes_alt: string
}

interface LocalDailyTask  { localId: string; description_en: string; description_alt: string }
interface LocalDetailTask { localId: string; description_en: string; description_alt: string }
interface LocalCoreRow    { localId: string; day_period: string; zone_area: string; zone_area_alt: string }

export interface JobCard {
  id: string
  prospect_id: string
  building_id: string | null
  position_id: string | null
  route: string | null
  shift_start: string | null
  shift_end: string | null
  special_instructions: string | null
  special_instructions_alt: string | null
  directions: string | null
  directions_alt: string | null
  notes_page1:     string | null
  notes_page1_alt: string | null
  notes_page2:     string | null
  notes_page2_alt: string | null
  revised_date: string
  service_days: string[]
  schedule_assignments: Record<string, number>
  is_translated: boolean
  prospects: { company_name: string } | null
  buildings: { building_name: string } | null
  positions: { position_name: string } | null
}

interface DBRouteRow   { id: string; row_type: string; time: string | null; area_location: string | null; notes: string | null; notes_alt: string | null; duration: string | null }
interface DBDailyTask  { id: string; description_en: string; description_alt: string | null }
interface DBDetailRow  { id: string; day_period: string; zone_area: string | null; zone_area_alt: string | null }
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

function buildContentSnapshot(
  hdr: {
    prospect_id: string; building_id: string; position_id: string; route: string
    shift_start: string; shift_end: string; special_instructions: string; directions: string
    notes_page1: string; notes_page2: string
    service_days: string[]; schedule_assignments: Record<string, number>
  },
  routeRows:   { row_type: string; time: string; area_location: string; notes: string }[],
  dailyTasks:  { description_en: string }[],
  coreDetails: { day_period: string; zone_area: string }[],
  detailTasks: { description_en: string }[],
): string {
  const sortedAssign = Object.fromEntries(
    Object.keys(hdr.schedule_assignments).sort().map(k => [k, hdr.schedule_assignments[k]])
  )
  const sortedDays = [...hdr.service_days].sort(
    (a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b)
  )
  return JSON.stringify({
    prospect_id:          hdr.prospect_id,
    building_id:          hdr.building_id          || null,
    position_id:          hdr.position_id          || null,
    route:                hdr.route                || null,
    shift_start:          hdr.shift_start          || null,
    shift_end:            hdr.shift_end            || null,
    special_instructions: hdr.special_instructions || null,
    directions:           hdr.directions           || null,
    notes_page1:          hdr.notes_page1          || null,
    notes_page2:          hdr.notes_page2          || null,
    service_days:         sortedDays,
    schedule_assignments: sortedAssign,
    route_rows:   sortRouteRows(routeRows).map(r => ({
      row_type:      r.row_type,
      time:          r.time          || null,
      area_location: r.area_location || null,
      notes:         r.notes         || null,
    })),
    daily_tasks:  dailyTasks.map(t => ({ description_en: t.description_en })),
    core_details: coreDetails.map(r => ({
      day_period: r.day_period,
      zone_area:  r.zone_area  || null,
    })),
    detail_tasks: detailTasks.map(t => ({ description_en: t.description_en })),
  })
}

const ALL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS    = ['1','2','3','4','5','6','7','8','9','10','11','12']
const MINUTES  = ['00','05','10','15','20','25','30','35','40','45','50','55']

// ─── Editor styles ────────────────────────────────────────────────────────────

const inp    = 'border border-gray-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-400'
const lbl    = 'block text-xs font-medium text-gray-500 mb-0.5'
const selCls = 'border border-gray-200 rounded px-1 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-400'

// ─── TimePicker ───────────────────────────────────────────────────────────────

function TimePicker({ value, onChange, disabled, defaultAmPm = 'AM' }: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  defaultAmPm?: 'AM' | 'PM'
}) {
  const m      = value ? value.match(/^(\d+):(\d+)\s*(AM|PM)$/i) : null
  const hour   = m ? m[1] : ''
  const minute = m ? m[2] : '00'
  const ampm   = (m ? m[3].toUpperCase() : defaultAmPm) as 'AM' | 'PM'

  function emit(h: string, min: string, ap: 'AM' | 'PM') {
    onChange(h ? `${h}:${min} ${ap}` : '')
  }

  return (
    <div className={`flex items-center gap-1 flex-shrink-0 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <select value={hour} onChange={e => emit(e.target.value, minute, ampm)}
        className={`${selCls} w-11 text-center`}>
        <option value="">—</option>
        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-gray-400 text-xs font-bold select-none">:</span>
      <select value={minute} onChange={e => { if (hour) emit(hour, e.target.value, ampm) }}
        disabled={!hour} className={`${selCls} w-13 text-center disabled:opacity-40`}>
        {MINUTES.map(min => <option key={min} value={min}>{min}</option>)}
      </select>
      <button type="button"
        onClick={() => { if (hour) emit(hour, minute, ampm === 'AM' ? 'PM' : 'AM') }}
        disabled={!hour}
        className={`text-xs font-bold px-1.5 py-1 rounded border transition-colors leading-none disabled:opacity-40 disabled:cursor-not-allowed ${
          ampm === 'PM'
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
        }`}>
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JobCardEditor({
  jobCard,
  initialRouteRows,
  initialDailyTasks,
  initialCoreDetails,
  initialDetailTasks,
  prospects,
  positions,
  companyLogoUrl,
}: {
  jobCard: JobCard
  initialRouteRows: DBRouteRow[]
  initialDailyTasks: DBDailyTask[]
  initialCoreDetails: DBDetailRow[]
  initialDetailTasks: DBWhenDetail[]
  prospects: Prospect[]
  positions: Position[]
  companyLogoUrl: string | null
}) {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [hdr, setHdr] = useState({
    prospect_id:              jobCard.prospect_id,
    building_id:              jobCard.building_id              ?? '',
    position_id:              jobCard.position_id              ?? '',
    route:                    jobCard.route                    ?? '',
    shift_start:              jobCard.shift_start              ?? '',
    shift_end:                jobCard.shift_end                ?? '',
    special_instructions:     jobCard.special_instructions     ?? '',
    directions:               jobCard.directions               ?? '',
    revised_date:             jobCard.revised_date,
    service_days:             jobCard.service_days             ?? [] as string[],
    schedule_assignments:     ((jobCard.schedule_assignments   ?? {}) as unknown) as Record<string, number>,
    special_instructions_alt: jobCard.special_instructions_alt ?? '',
    directions_alt:           jobCard.directions_alt           ?? '',
    notes_page1:              jobCard.notes_page1              ?? '',
    notes_page1_alt:          jobCard.notes_page1_alt          ?? '',
    notes_page2:              jobCard.notes_page2              ?? '',
    notes_page2_alt:          jobCard.notes_page2_alt          ?? '',
  })

  // Clock In/Out rows are seeded from shift times; auto-sync via useEffect below
  const [routeRows,   setRouteRows]   = useState<LocalRouteRow[]>(sortRouteRows(initialRouteRows.map(r => ({
    localId: uid(),
    row_type: r.row_type as RouteRowType,
    time: r.row_type === 'clock_in'  ? (jobCard.shift_start ?? '')
        : r.row_type === 'clock_out' ? (jobCard.shift_end   ?? '')
        : (r.time ?? ''),
    area_location: r.area_location ?? '',
    notes:         r.notes ?? '',
    notes_alt:     r.notes_alt ?? '',
  }))))

  const [dailyTasks,  setDailyTasks]  = useState<LocalDailyTask[]>(initialDailyTasks.map(t => ({
    localId: uid(), description_en: t.description_en, description_alt: t.description_alt ?? '',
  })))

  const [coreDetails, setCoreDetails] = useState<LocalCoreRow[]>(initialCoreDetails.map(r => ({
    localId: uid(), day_period: r.day_period, zone_area: r.zone_area ?? '', zone_area_alt: r.zone_area_alt ?? '',
  })))

  const [detailTasks, setDetailTasks] = useState<LocalDetailTask[]>(initialDetailTasks.map(t => ({
    localId: uid(), description_en: t.description_en, description_alt: t.description_alt ?? '',
  })))

  const [buildings,       setBuildings]       = useState<Building[]>([])
  const [buildingsLoaded, setBuildingsLoaded] = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [saved,           setSaved]           = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [translating,     setTranslating]     = useState(false)
  const [translateError,  setTranslateError]  = useState<string | null>(null)
  const [isTranslated,    setIsTranslated]    = useState(jobCard.is_translated ?? false)
  const [includeLogo,     setIncludeLogo]     = useState(false)

  // Cache: English text → Spanish translation (session-scoped)
  const translationCache = useRef<Map<string, string>>(new Map())

  // Guard against saving empty state over real data (e.g. if initial load failed)
  const initialHadData = useRef({
    routeRows:   initialRouteRows.length   > 0,
    dailyTasks:  initialDailyTasks.length  > 0,
    coreDetails: initialCoreDetails.length > 0,
    detailTasks: initialDetailTasks.length > 0,
  })

  // Baseline content snapshot captured at mount. Compared at save time to decide
  // whether revised_date should auto-stamp to today. Reset after every successful
  // save so the next no-op save (e.g. opening the card the following day) does not
  // re-stamp.
  const contentSnapshot = useRef<string>(
    buildContentSnapshot(hdr, routeRows, dailyTasks, coreDetails, detailTasks)
  )

  // Client-side fallback: if server props were empty (e.g. a caching/RLS issue),
  // fetch child records directly from Supabase on mount.
  useEffect(() => {
    const allEmpty =
      initialRouteRows.length === 0 &&
      initialDailyTasks.length === 0 &&
      initialCoreDetails.length === 0 &&
      initialDetailTasks.length === 0

    if (!allEmpty) return

    async function loadChildData() {
      const [
        { data: rr, error: rrErr },
        { data: dt, error: dtErr },
        { data: cd, error: cdErr },
        { data: wdt, error: wdtErr },
      ] = await Promise.all([
        supabase.from('job_card_route_rows').select('*').eq('job_card_id', jobCard.id).order('sort_order'),
        supabase.from('job_card_daily_tasks').select('*').eq('job_card_id', jobCard.id).order('sort_order'),
        supabase.from('job_card_detail_schedule').select('*').eq('job_card_id', jobCard.id).order('sort_order'),
        supabase.from('job_card_when_detailing').select('*').eq('job_card_id', jobCard.id).order('sort_order'),
      ])
      console.log('[JobCardEditor] client-side fallback', {
        routesCount:   rr?.length  ?? 0,  routesError:   rrErr  ?? null,
        tasksCount:    dt?.length  ?? 0,  tasksError:    dtErr  ?? null,
        scheduleCount: cd?.length  ?? 0,  scheduleError: cdErr  ?? null,
        detailsCount:  wdt?.length ?? 0,  detailsError:  wdtErr ?? null,
      })

      // Map each result once. The same objects go to both the setter and the
      // snapshot so the baseline is guaranteed to match the post-setState state.
      const mappedRouteRows = sortRouteRows((rr ?? []).map((r: DBRouteRow) => ({
        localId:       uid(),
        row_type:      r.row_type as RouteRowType,
        time:          r.row_type === 'clock_in'  ? (jobCard.shift_start ?? '')
                     : r.row_type === 'clock_out' ? (jobCard.shift_end   ?? '')
                     : (r.time ?? ''),
        area_location: r.area_location ?? '',
        notes:         r.notes         ?? '',
        notes_alt:     r.notes_alt     ?? '',
      })))
      const mappedDailyTasks = (dt ?? []).map((t: DBDailyTask) => ({
        localId: uid(), description_en: t.description_en, description_alt: t.description_alt ?? '',
      }))
      const mappedCoreDetails = (cd ?? []).map((r: DBDetailRow) => ({
        localId: uid(), day_period: r.day_period, zone_area: r.zone_area ?? '', zone_area_alt: r.zone_area_alt ?? '',
      }))
      const mappedDetailTasks = (wdt ?? []).map((t: DBWhenDetail) => ({
        localId: uid(), description_en: t.description_en, description_alt: t.description_alt ?? '',
      }))

      if (mappedRouteRows.length)   setRouteRows(mappedRouteRows)
      if (mappedDailyTasks.length)  setDailyTasks(mappedDailyTasks)
      if (mappedCoreDetails.length) setCoreDetails(mappedCoreDetails)
      if (mappedDetailTasks.length) setDetailTasks(mappedDetailTasks)

      // Resync baseline: the mount-time snapshot was built from empty arrays
      // (the condition for this fallback to fire). Reset it now from the exact
      // same mapped objects passed to the setters — buildContentSnapshot ignores
      // localId and _alt fields, so no extra stripping needed.
      contentSnapshot.current = buildContentSnapshot(
        hdr, mappedRouteRows, mappedDailyTasks, mappedCoreDetails, mappedDetailTasks,
      )
    }

    void loadChildData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-sync Clock In time with shift_start
  useEffect(() => {
    setRouteRows(prev => prev.map(r =>
      r.row_type === 'clock_in' ? { ...r, time: hdr.shift_start } : r
    ))
  }, [hdr.shift_start])

  // Auto-sync Clock Out time with shift_end
  useEffect(() => {
    setRouteRows(prev => prev.map(r =>
      r.row_type === 'clock_out' ? { ...r, time: hdr.shift_end } : r
    ))
  }, [hdr.shift_end])

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

  // ── Translation ──────────────────────────────────────────────────────────────

  async function handleTranslate() {
    setTranslating(true)
    setTranslateError(null)

    const needsTranslation = new Set<string>()
    function queue(text: string) {
      if (text.trim() && !translationCache.current.has(text)) needsTranslation.add(text)
    }

    dailyTasks.forEach(t  => queue(t.description_en))
    detailTasks.forEach(t => queue(t.description_en))
    coreDetails.forEach(c => queue(c.zone_area))
    routeRows.forEach(r => { if (r.row_type === 'task') queue(r.notes) })
    queue(hdr.special_instructions)
    queue(hdr.directions)
    queue(hdr.notes_page1)
    queue(hdr.notes_page2)

    try {
      if (needsTranslation.size > 0) {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: Array.from(needsTranslation) }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { translations, error: apiErr } = await res.json() as {
          translations?: { en: string; es: string }[]
          error?: string
        }
        if (apiErr) throw new Error(apiErr)
        translations?.forEach(({ en, es }) => { if (en && es) translationCache.current.set(en, es) })
      }

      const t = translationCache.current
      setDailyTasks(prev  => prev.map(x => ({ ...x, description_alt: t.get(x.description_en) ?? x.description_alt })))
      setDetailTasks(prev => prev.map(x => ({ ...x, description_alt: t.get(x.description_en) ?? x.description_alt })))
      setCoreDetails(prev => prev.map(x => ({ ...x, zone_area_alt:   t.get(x.zone_area)       ?? x.zone_area_alt  })))
      setRouteRows(prev => prev.map(r =>
        r.row_type === 'task' ? { ...r, notes_alt: t.get(r.notes) ?? r.notes_alt } : r
      ))
      setHdr(prev => ({
        ...prev,
        special_instructions_alt: t.get(prev.special_instructions) ?? prev.special_instructions_alt,
        directions_alt:           t.get(prev.directions)           ?? prev.directions_alt,
        notes_page1_alt:          t.get(prev.notes_page1)          ?? prev.notes_page1_alt,
        notes_page2_alt:          t.get(prev.notes_page2)          ?? prev.notes_page2_alt,
      }))

      // Persist is_translated flag immediately on success
      const { error: flagErr } = await supabase
        .from('job_cards')
        .update({ is_translated: true })
        .eq('id', jobCard.id)
      if (!flagErr) setIsTranslated(true)

    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setTranslating(false)
    }
  }

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false)

    // Abort if a section that had data on load is now empty — prevents delete-without-reinsert data loss
    const h = initialHadData.current
    if (
      (h.routeRows   && routeRows.length   === 0) ||
      (h.dailyTasks  && dailyTasks.length  === 0) ||
      (h.coreDetails && coreDetails.length === 0) ||
      (h.detailTasks && detailTasks.length === 0)
    ) {
      setError('Save blocked: one or more sections appear empty but had data when loaded. Refresh the page and try again.')
      setSaving(false)
      return
    }

    const currentSnapshot = buildContentSnapshot(hdr, routeRows, dailyTasks, coreDetails, detailTasks)
    const contentChanged  = currentSnapshot !== contentSnapshot.current
    const d     = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const payload = {
      prospect_id:          hdr.prospect_id,
      building_id:          hdr.building_id          || null,
      position_id:          hdr.position_id          || null,
      route:                hdr.route                || null,
      shift_start:          hdr.shift_start          || null,
      shift_end:            hdr.shift_end            || null,
      special_instructions:     hdr.special_instructions     || null,
      special_instructions_alt: hdr.special_instructions_alt || null,
      directions:               hdr.directions               || null,
      directions_alt:           hdr.directions_alt           || null,
      notes_page1:              hdr.notes_page1              || null,
      notes_page1_alt:          hdr.notes_page1_alt          || null,
      notes_page2:              hdr.notes_page2              || null,
      notes_page2_alt:          hdr.notes_page2_alt          || null,
      revised_date:             contentChanged ? today : hdr.revised_date,
      service_days:         hdr.service_days,
      schedule_assignments: hdr.schedule_assignments,
      is_translated:        isTranslated,
    }

    if (contentChanged) setHdr(prev => ({ ...prev, revised_date: today }))

    const { error: e0 } = await supabase.from('job_cards').update(payload).eq('id', jobCard.id)
    if (e0) { setError(e0.message); setSaving(false); return }

    // Build all insert payloads before deleting, so a schema error aborts
    // before any data is lost.
    const routeInsert = sortRouteRows(routeRows).map((r, i) => ({
      job_card_id: jobCard.id, sort_order: i, row_type: r.row_type,
      time: r.time || null, area_location: r.area_location || null,
      notes: r.notes || null, notes_alt: r.notes_alt || null,
    }))
    const dailyInsert = dailyTasks.map((t, i) => ({
      job_card_id: jobCard.id, sort_order: i,
      description_en: t.description_en, description_alt: t.description_alt || null,
    }))
    const coreInsert = coreDetails.map((r, i) => ({
      job_card_id: jobCard.id, sort_order: i,
      day_period: r.day_period, zone_area: r.zone_area || null, zone_area_alt: r.zone_area_alt || null,
    }))
    const detailInsert = detailTasks.map((t, i) => ({
      job_card_id: jobCard.id, sort_order: i,
      description_en: t.description_en, description_alt: t.description_alt || null,
    }))

    // Delete then insert (within each table sequentially to preserve order).
    const tables = [
      { tbl: 'job_card_route_rows'     as const, rows: routeInsert  },
      { tbl: 'job_card_daily_tasks'    as const, rows: dailyInsert  },
      { tbl: 'job_card_detail_schedule'as const, rows: coreInsert   },
      { tbl: 'job_card_when_detailing' as const, rows: detailInsert },
    ]

    for (const { tbl, rows } of tables) {
      const { error: de } = await supabase.from(tbl).delete().eq('job_card_id', jobCard.id)
      if (de) { setError(de.message); setSaving(false); return }

      if (rows.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: ie } = await supabase.from(tbl).insert(rows as any[])
        if (ie) { setError(ie.message); setSaving(false); return }
      }
    }

    contentSnapshot.current = currentSnapshot
    setSaved(true); setSaving(false)
    router.refresh()
  }

  return (
    <>
      {/* ── Editor ──────────────────────────────────────────────────── */}
      <div className="p-6 space-y-6 max-w-4xl">

        {/* Action bar */}
        <div className="flex items-center gap-3 flex-wrap">
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
          <a
            href={`/job-cards/${jobCard.id}/print${includeLogo ? '' : '?logo=0'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 border border-gray-300 hover:border-gray-400 text-gray-700 bg-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print {isTranslated ? '(4 pages)' : '(2 pages)'}
          </a>
          {companyLogoUrl && (
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeLogo}
                onChange={(e) => setIncludeLogo(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Include logo
            </label>
          )}
          <button onClick={handleTranslate} disabled={translating}
            className="flex items-center gap-1.5 border border-gray-300 hover:border-gray-400 text-gray-700 bg-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
            {translating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Translating…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                {isTranslated ? 'Re-translate' : 'Translate to Spanish'}
              </>
            )}
          </button>
          {isTranslated && (
            <span className="text-xs text-indigo-600 font-medium bg-indigo-50 border border-indigo-200 px-2 py-1 rounded">
              Spanish pages active
            </span>
          )}
          {saved          && <span className="text-sm text-green-700 font-medium">Saved.</span>}
          {error          && <span className="text-sm text-red-600">{error}</span>}
          {translateError && <span className="text-sm text-red-600">Translation error: {translateError}</span>}
        </div>

        {/* ── Header ──────────────────────────────────────────────── */}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Shift Start</label>
                <TimePicker value={hdr.shift_start} onChange={v => setHdrField('shift_start', v)} />
              </div>
              <div>
                <label className={lbl}>Shift End</label>
                <TimePicker value={hdr.shift_end} onChange={v => setHdrField('shift_end', v)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Special Instructions</label>
                <textarea value={hdr.special_instructions} onChange={sh('special_instructions')}
                  rows={3} placeholder="Any special notes for the crew…" className={`${inp} w-full resize-none`} />
                {hdr.special_instructions_alt && (
                  <p className="mt-1 text-xs text-indigo-600 italic">
                    <span className="font-semibold">ES:</span> {hdr.special_instructions_alt}
                  </p>
                )}
              </div>
              <div>
                <label className={lbl}>Directions</label>
                <textarea value={hdr.directions} onChange={sh('directions')}
                  rows={3} placeholder="How to get to the site, parking, access codes…" className={`${inp} w-full resize-none`} />
                {hdr.directions_alt && (
                  <p className="mt-1 text-xs text-indigo-600 italic">
                    <span className="font-semibold">ES:</span> {hdr.directions_alt}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Daily Cleaning Notes</label>
                <textarea value={hdr.notes_page1} onChange={sh('notes_page1')}
                  rows={3} placeholder="Optional note printed under the route table…" className={`${inp} w-full resize-none`} />
                {hdr.notes_page1_alt && (
                  <p className="mt-1 text-xs text-indigo-600 italic">
                    <span className="font-semibold">Alt:</span> {hdr.notes_page1_alt}
                  </p>
                )}
              </div>
              <div>
                <label className={lbl}>Detail Notes</label>
                <textarea value={hdr.notes_page2} onChange={sh('notes_page2')}
                  rows={3} placeholder="Optional note printed under the schedule table…" className={`${inp} w-full resize-none`} />
                {hdr.notes_page2_alt && (
                  <p className="mt-1 text-xs text-indigo-600 italic">
                    <span className="font-semibold">Alt:</span> {hdr.notes_page2_alt}
                  </p>
                )}
              </div>
            </div>

            <div className="w-40">
              <label className={lbl}>Revised Date</label>
              <input type="date" value={hdr.revised_date} onChange={sh('revised_date')} className={`${inp} w-full`} />
            </div>
          </div>
        </div>

        {/* ── Route ───────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <SectionHeader title="Route" onAdd={() => setRouteRows(prev => [
            ...prev, { localId: uid(), row_type: 'task', time: '', area_location: '', notes: '', notes_alt: '' }
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
                  first={row.row_type !== 'task' || routeRows[i - 1]?.row_type !== 'task'}
                  last={row.row_type !== 'task'  || routeRows[i + 1]?.row_type !== 'task'}
                />
                {row.row_type !== 'task' ? (
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-600 w-24 flex-shrink-0">
                      {row.row_type === 'clock_in' ? 'CLOCK IN' : 'CLOCK OUT'}
                    </span>
                    <span className="text-sm text-gray-600 font-medium">
                      {row.time || <span className="text-gray-400 italic text-xs">Set shift time in Header</span>}
                    </span>
                    <span className="text-xs text-gray-400 italic">(auto from shift)</span>
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
                        defaultAmPm={(hdr.shift_start.match(/\b(AM|PM)\b/i)?.[1]?.toUpperCase() ?? 'AM') as 'AM' | 'PM'}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className={lbl}>Notes</label>
                      <input type="text" value={row.notes}
                        onChange={e => setRouteRows(p => p.map((r, x) => x === i ? { ...r, notes: e.target.value } : r))}
                        placeholder="Free text notes" maxLength={100} className={`${inp} w-full`} />
                      {row.notes_alt && (
                        <p className="mt-0.5 text-xs text-indigo-600 italic">
                          <span className="font-semibold">ES:</span> {row.notes_alt}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {(['clock_in', 'clock_out'] as RouteRowType[]).map(type => (
                <button key={type}
                  onClick={() => setRouteRows(prev => sortRouteRows([...prev, {
                    localId: uid(), row_type: type,
                    time: type === 'clock_in' ? hdr.shift_start : hdr.shift_end,
                    area_location: '', notes: '', notes_alt: '',
                  }]))}
                  className="text-xs font-medium text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-3 py-1 rounded-full transition-colors">
                  + {type === 'clock_in' ? 'CLOCK IN' : 'CLOCK OUT'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Daily Tasks ──────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <SectionHeader title="Daily Tasks" onAdd={() => setDailyTasks(p => [
            ...p, { localId: uid(), description_en: '', description_alt: '' }
          ])} addLabel="Add Task" />
          <div className="px-5 py-4 space-y-2">
            {dailyTasks.length === 0 && <p className="text-sm text-gray-400 italic py-2">No daily tasks yet.</p>}
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
                    <label className={lbl}>Spanish</label>
                    <input type="text" value={t.description_alt}
                      onChange={e => setDailyTasks(p => p.map((x, j) => j === i ? { ...x, description_alt: e.target.value } : x))}
                      maxLength={150} placeholder="Translation" className={`${inp} w-full`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Detail Tasks ─────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <SectionHeader title="Detail Tasks" onAdd={() => setDetailTasks(p => [
            ...p, { localId: uid(), description_en: '', description_alt: '' }
          ])} addLabel="Add Task" />
          <div className="px-5 pb-3 pt-1">
            <p className="text-xs text-gray-400 italic">Include frequency in parentheses, e.g. &ldquo;Shampoo carpets (2x/month)&rdquo;</p>
          </div>
          <div className="px-5 py-2 space-y-2">
            {detailTasks.length === 0 && <p className="text-sm text-gray-400 italic py-2">No detail tasks yet.</p>}
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
                    <label className={lbl}>Spanish</label>
                    <input type="text" value={t.description_alt}
                      onChange={e => setDetailTasks(p => p.map((x, j) => j === i ? { ...x, description_alt: e.target.value } : x))}
                      maxLength={150} placeholder="Translation" className={`${inp} w-full`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Service Schedule ─────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <SectionHeader title="Service Schedule" />
          <div className="px-5 py-5 space-y-6">

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

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className={lbl}>Area Schedule</p>
                <button onClick={() => setCoreDetails(p => [
                  ...p, { localId: uid(), day_period: '', zone_area: '', zone_area_alt: '' }
                ])} className="text-xs font-medium text-brand-600 hover:text-brand-800 flex items-center gap-1">
                  <span className="text-base leading-none">+</span> Add Row
                </button>
              </div>

              {coreDetails.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No areas defined yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="text-xs border-collapse w-full">
                    <thead>
                      <tr>
                        <th className="border border-gray-200 px-3 py-1.5 text-left text-gray-600 font-semibold bg-gray-50">
                          Area / Location
                        </th>
                        {hdr.service_days.map(day => (
                          <th key={day} className="border border-gray-200 px-3 py-1.5 text-center text-gray-600 font-semibold bg-gray-50 w-12">
                            {day}
                          </th>
                        ))}
                        <th className="w-8 border-0" />
                      </tr>
                    </thead>
                    <tbody>
                      {coreDetails.map((core, coreIdx) => (
                        <tr key={core.localId}>
                          <td className="border border-gray-200 px-2 py-1">
                            <input
                              type="text"
                              value={core.zone_area}
                              onChange={e => setCoreDetails(p => p.map((x, j) => j === coreIdx ? { ...x, zone_area: e.target.value } : x))}
                              placeholder="Area or location"
                              maxLength={50}
                              className={`${inp} w-full`}
                            />
                            {core.zone_area_alt && (
                              <p className="mt-0.5 text-xs text-indigo-600 italic">
                                <span className="font-semibold">ES:</span> {core.zone_area_alt}
                              </p>
                            )}
                          </td>
                          {hdr.service_days.map(day => {
                            const checked = hdr.schedule_assignments[day] === coreIdx
                            return (
                              <td key={day} className="border border-gray-200 px-3 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => setAssignment(day, checked ? null : coreIdx)}
                                  className="w-4 h-4 accent-brand-600 cursor-pointer"
                                />
                              </td>
                            )
                          })}
                          <td className="px-1 border-0">
                            <button
                              type="button"
                              onClick={() => {
                                setCoreDetails(p => removeAt(p, coreIdx))
                                setHdr(prev => {
                                  const assignments: Record<string, number> = {}
                                  for (const [day, idx] of Object.entries(prev.schedule_assignments)) {
                                    if (idx < coreIdx) assignments[day] = idx
                                    else if (idx > coreIdx) assignments[day] = idx - 1
                                  }
                                  return { ...prev, schedule_assignments: assignments }
                                })
                              }}
                              className="p-0.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-400"
                              title="Delete row"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
