'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { updateAreaField, type AreaPatch } from './actions'
import { createTaskLineItemInline, type InlineTaskData, updateTaskLineItemField, type TaskLineItemPatch, deleteTaskLineItem } from './[areaId]/task-line-items/actions'
import type { Area } from '@/types/area'
import { calculateHours } from '@/types/task-line-item'
import type { TaskCodeForForm, TaskLineItemRow } from '@/types/task-line-item'
import type { Position } from '@/types/position'
import SearchableSelect, { type SelectOption } from '@/components/ui/SearchableSelect'

type PendingDelete = { taskId: string; taskName: string; areaId: string; timeoutId: ReturnType<typeof setTimeout> }

const TH = 'px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap select-none'
const TD = 'px-1 py-0.5'
const cellInput = [
  'block w-full bg-transparent text-sm',
  'px-1.5 py-1 rounded',
  'focus:outline-none focus:ring-1 focus:ring-inset focus:ring-brand-500 focus:bg-white',
  'hover:bg-white hover:ring-1 hover:ring-gray-200',
].join(' ')

function InlineTaskRow({
  areaId,
  taskCodes,
  defaultFrequency,
  defaultQuantity,
  onCreated,
  positions,
}: {
  areaId:           string
  taskCodes:        TaskCodeForForm[]
  defaultFrequency: number | null
  defaultQuantity:  number | null
  onCreated:        (row: TaskLineItemRow) => void
  positions:        Pick<Position, 'id' | 'position_name'>[]
}) {
  const [taskCodeId, setTaskCodeId]   = useState('')
  const [taskName, setTaskName]       = useState('')
  const [frequency, setFrequency]     = useState(defaultFrequency != null ? String(defaultFrequency) : '')
  const [percent, setPercent]         = useState('100')
  const [quantity, setQuantity]       = useState(defaultQuantity != null ? String(defaultQuantity) : '')
  const [minutes, setMinutes]         = useState('')
  const [measure, setMeasure]         = useState<string | null>(null)
  const [positionId, setPositionId]   = useState('')
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [resetKey, setResetKey]       = useState(0)

  const taskNameRef       = useRef<HTMLInputElement>(null)
  const hasActiveFocusRef = useRef(false)
  const pendingCreateRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef        = useRef(true)
  const valuesRef         = useRef({ taskCodeId, taskName, positionId, frequency, percent, quantity, minutes })
  valuesRef.current = { taskCodeId, taskName, positionId, frequency, percent, quantity, minutes }

  useEffect(() => () => {
    mountedRef.current = false
    if (pendingCreateRef.current) clearTimeout(pendingCreateRef.current)
  }, [])

  const codeOptions: SelectOption[] = taskCodes.map(tc => ({
    value:      tc.id,
    label:      tc.task_code,
    searchText: `${tc.task_code} ${tc.task_name}`,
  }))

  const positionOptions: SelectOption[] = positions.map(p => ({
    value: p.id,
    label: p.position_name,
  }))

  function handleFocus() {
    hasActiveFocusRef.current = true
    if (pendingCreateRef.current) {
      clearTimeout(pendingCreateRef.current)
      pendingCreateRef.current = null
    }
  }

  function handleBlur() {
    hasActiveFocusRef.current = false
    pendingCreateRef.current = setTimeout(async () => {
      if (hasActiveFocusRef.current || !mountedRef.current) return
      const v = valuesRef.current
      if (!v.taskName.trim()) return

      setCreating(true)
      setCreateError(null)

      const tc  = taskCodes.find(t => t.id === v.taskCodeId)
      const pct = parseInt(v.percent, 10) || 100
      const qty = v.quantity  ? parseFloat(v.quantity)  : null
      const min = v.minutes   ? parseFloat(v.minutes)   : null
      const frq = v.frequency ? parseInt(v.frequency, 10) : null

      const data: InlineTaskData = {
        task_code_id: v.taskCodeId || null,
        task_name:    v.taskName.trim(),
        position_id:  v.positionId     || null,
        frequency:    frq,
        percent:      pct,
        quantity:     qty,
        minutes:      min,
        measure:      tc?.unit_of_measure       ?? null,
        type:         tc?.task_types?.type_name ?? null,
      }

      const result = await createTaskLineItemInline(areaId, data)
      if (!mountedRef.current) return

      setCreating(false)
      if (result.error) { setCreateError(result.error); return }
      if (result.row) {
        onCreated(result.row)
        setTaskCodeId('')
        setTaskName('')
        setFrequency(defaultFrequency != null ? String(defaultFrequency) : '')
        setPercent('100')
        setQuantity(defaultQuantity != null ? String(defaultQuantity) : '')
        setMinutes('')
        setMeasure(null)
        setPositionId('')
        setResetKey(k => k + 1)
      }
    }, 200)
  }

  function handleCodeSelect(value: string) {
    setTaskCodeId(value)
    if (value) {
      const tc = taskCodes.find(t => t.id === value)
      if (tc) {
        setTaskName(tc.task_name)
        setMinutes(tc.production_rate != null ? String(tc.production_rate) : '')
        setMeasure(tc.unit_of_measure ?? null)
        setPositionId(tc.position_id ?? '')
      }
      setTimeout(() => taskNameRef.current?.focus(), 160)
    } else {
      setMeasure(null)
      setPositionId('')
    }
  }

  if (creating) {
    return (
      <tr className="border-t border-dashed border-gray-200">
        <td colSpan={11} className="px-4 py-2 text-center text-xs text-gray-400 italic">Saving…</td>
      </tr>
    )
  }

  const liveHrs = measure != null
    ? calculateHours(
        measure,
        quantity  ? parseFloat(quantity)    : null,
        minutes   ? parseFloat(minutes)     : null,
        frequency ? parseInt(frequency, 10) : null,
        parseInt(percent, 10) || 100,
      )
    : null

  function fmtHr(v: number | null) {
    return v != null ? v.toFixed(2) : '—'
  }

  return (
    <>
      {createError && (
        <tr>
          <td colSpan={11} className="px-3 py-1">
            <span className="text-xs text-red-600">{createError}</span>
          </td>
        </tr>
      )}
      <tr className="border-t border-dashed border-gray-200 bg-blue-50/30">
        <td className="px-1 py-1 min-w-[7rem]">
          <div onFocus={handleFocus} onBlur={handleBlur}>
            <SearchableSelect
              key={resetKey}
              name="inline_task_code"
              options={codeOptions}
              placeholder="Code…"
              onSelect={handleCodeSelect}
            />
          </div>
        </td>
        <td className="px-1 py-1 min-w-[10rem]">
          <input ref={taskNameRef} type="text" placeholder="Task name…"
            value={taskName} readOnly
            onFocus={handleFocus} onBlur={handleBlur}
            className={`${cellInput} bg-gray-50 cursor-default focus:ring-0`} />
        </td>
        <td className="px-1 py-1 min-w-[8rem]">
          <div onFocus={handleFocus} onBlur={handleBlur}>
            <SearchableSelect
              key={`pos-${taskCodeId}-${resetKey}`}
              name="inline_position"
              options={positionOptions}
              defaultValue={positionId}
              placeholder="Position…"
              onSelect={setPositionId}
            />
          </div>
        </td>
        <td className="px-1 py-1 w-16">
          <input type="number" min="1" step="1" placeholder="—"
            value={frequency} onChange={(e) => setFrequency(e.target.value)}
            onFocus={handleFocus} onBlur={handleBlur}
            className={`${cellInput} tabular-nums text-right`} />
        </td>
        <td className="px-1 py-1 w-14">
          <input type="number" min="0" max="100" step="1"
            value={percent} onChange={(e) => setPercent(e.target.value)}
            onFocus={handleFocus} onBlur={handleBlur}
            className={`${cellInput} tabular-nums text-right`} />
        </td>
        <td className="px-1 py-1 w-20">
          <input type="number" min="0" step="any" placeholder="—"
            value={quantity} onChange={(e) => setQuantity(e.target.value)}
            onFocus={handleFocus} onBlur={handleBlur}
            className={`${cellInput} tabular-nums text-right`} />
        </td>
        <td className="px-1 py-1 w-20">
          <input type="number" min="0" step="any" placeholder="—"
            value={minutes} onChange={(e) => setMinutes(e.target.value)}
            onFocus={handleFocus} onBlur={handleBlur}
            className={`${cellInput} tabular-nums text-right`} />
        </td>
        <td className="px-2 py-1 text-sm tabular-nums text-gray-700">{fmtHr(liveHrs?.daily_hrs   ?? null)}</td>
        <td className="px-2 py-1 text-sm tabular-nums text-gray-700">{fmtHr(liveHrs?.weekly_hrs  ?? null)}</td>
        <td className="px-2 py-1 text-sm tabular-nums text-gray-700">{fmtHr(liveHrs?.monthly_hrs ?? null)}</td>
        <td className="px-2 py-1 text-sm font-medium tabular-nums text-gray-900">{fmtHr(liveHrs?.yearly_hrs  ?? null)}</td>
      </tr>
    </>
  )
}

function SavedTaskRow({
  task,
  taskCodes,
  positions,
  onUpdated,
  onDelete,
}: {
  task:      TaskLineItemRow
  taskCodes: TaskCodeForForm[]
  positions: Pick<Position, 'id' | 'position_name'>[]
  onUpdated: (row: TaskLineItemRow) => void
  onDelete:  (taskId: string, taskName: string, areaId: string) => void
}) {
  const [taskCodeId, setTaskCodeId] = useState(task.task_code_id ?? '')
  const [taskName, setTaskName]     = useState(task.task_name)
  const [positionId, setPositionId] = useState(task.position_id ?? '')
  const [frequency, setFrequency]   = useState(task.frequency != null ? String(task.frequency) : '')
  const [percent, setPercent]       = useState(String(task.percent))
  const [quantity, setQuantity]     = useState(task.quantity != null ? String(task.quantity) : '')
  const [minutes, setMinutes]       = useState(task.minutes != null ? String(task.minutes) : '')
  const [measure, setMeasure]       = useState<string | null>(task.measure)
  const [saving, setSaving]         = useState(false)
  const [rowError, setRowError]     = useState<string | null>(null)
  const [syncVersion, setSyncVersion] = useState(0)

  const hasActiveFocusRef = useRef(false)
  const inFlightSavesRef  = useRef(0)

  useEffect(() => {
    if (hasActiveFocusRef.current || inFlightSavesRef.current > 0) return
    setTaskCodeId(task.task_code_id ?? '')
    setTaskName(task.task_name)
    setPositionId(task.position_id ?? '')
    setFrequency(task.frequency != null ? String(task.frequency) : '')
    setPercent(String(task.percent))
    setQuantity(task.quantity != null ? String(task.quantity) : '')
    setMinutes(task.minutes != null ? String(task.minutes) : '')
    setMeasure(task.measure)
    setSyncVersion(v => v + 1)
  }, [task])

  const codeOptions: SelectOption[] = taskCodes.map(tc => ({
    value: tc.id, label: tc.task_code, searchText: `${tc.task_code} ${tc.task_name}`,
  }))

  const positionOptions: SelectOption[] = positions.map(p => ({
    value: p.id, label: p.position_name,
  }))

  const liveHrs = measure != null
    ? calculateHours(
        measure,
        quantity  ? parseFloat(quantity)    : null,
        minutes   ? parseFloat(minutes)     : null,
        frequency ? parseInt(frequency, 10) : null,
        parseInt(percent, 10) || 100,
      )
    : null

  function fmtHr(v: number | null) { return v != null ? v.toFixed(2) : '—' }

  async function save(patch: TaskLineItemPatch) {
    inFlightSavesRef.current++
    setSaving(true)
    setRowError(null)
    try {
      const result = await updateTaskLineItemField(task.id, patch)
      if (result.error) { setRowError(result.error); return }
      if (result.row && inFlightSavesRef.current === 1) onUpdated(result.row)
    } finally {
      inFlightSavesRef.current--
      if (inFlightSavesRef.current === 0) setSaving(false)
    }
  }

  async function handleCodeSelect(value: string) {
    const tc = value ? taskCodes.find(t => t.id === value) : null
    setTaskCodeId(value)
    if (tc) {
      setTaskName(tc.task_name)
      setMinutes(tc.production_rate != null ? String(tc.production_rate) : '')
      setMeasure(tc.unit_of_measure ?? null)
      setPositionId(tc.position_id ?? '')
      await save({
        task_code_id: value,
        task_name:    tc.task_name,
        minutes:      tc.production_rate ?? null,
        measure:      tc.unit_of_measure ?? null,
        position_id:  tc.position_id     ?? null,
      })
    } else {
      setTaskName('')
      setMeasure(null)
      setPositionId('')
      await save({ task_code_id: null, task_name: '', minutes: null, measure: null, position_id: null })
    }
  }

  async function handlePositionSelect(value: string) {
    setPositionId(value)
    await save({ position_id: value || null })
  }

  async function handleNumBlur(field: keyof TaskLineItemPatch, raw: string, isInt: boolean) {
    const trimmed = raw.trim()
    const value: number | null = trimmed === '' ? null : isInt ? parseInt(trimmed, 10) : parseFloat(trimmed)
    if (value !== null && Number.isNaN(value)) return
    await save({ [field]: value } as TaskLineItemPatch)
  }

  return (
    <>
      {rowError && (
        <tr>
          <td colSpan={11} className="px-3 py-1">
            <span className="text-xs text-red-600">{rowError}</span>
          </td>
        </tr>
      )}
      <tr className={`hover:bg-gray-50 transition-colors${saving ? ' opacity-60' : ''}`}>
        <td className="px-1 py-1 min-w-[7rem]">
          <div className="flex items-center gap-1">
            <div className="flex-1"
              onFocus={() => { hasActiveFocusRef.current = true }}
              onBlur={() => { hasActiveFocusRef.current = false }}
            >
              <SearchableSelect
                key={`code-${syncVersion}`}
                name={`task_code_${task.id}`}
                options={codeOptions}
                defaultValue={taskCodeId}
                placeholder="Code…"
                onSelect={handleCodeSelect}
              />
            </div>
            <button
              onClick={() => onDelete(task.id, task.task_name, task.area_id)}
              tabIndex={-1}
              title="Delete task"
              className="shrink-0 text-gray-300 hover:text-red-500 transition-colors text-base leading-none px-0.5"
            >
              ×
            </button>
          </div>
        </td>
        <td className="px-2 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">
          {taskName || '—'}
        </td>
        <td className="px-1 py-1 min-w-[8rem]">
          <div
            onFocus={() => { hasActiveFocusRef.current = true }}
            onBlur={() => { hasActiveFocusRef.current = false }}
          >
            <SearchableSelect
              key={`pos-${syncVersion}`}
              name={`position_${task.id}`}
              options={positionOptions}
              defaultValue={positionId}
              placeholder="Position…"
              onSelect={handlePositionSelect}
            />
          </div>
        </td>
        <td className="px-1 py-1 w-16">
          <input type="number" min="1" step="1" placeholder="—"
            value={frequency} onChange={e => setFrequency(e.target.value)}
            onFocus={() => { hasActiveFocusRef.current = true }}
            onBlur={e => { hasActiveFocusRef.current = false; void handleNumBlur('frequency', e.target.value, true) }}
            className={`${cellInput} tabular-nums text-right`} />
        </td>
        <td className="px-1 py-1 w-14">
          <input type="number" min="0" max="100" step="1"
            value={percent} onChange={e => setPercent(e.target.value)}
            onFocus={() => { hasActiveFocusRef.current = true }}
            onBlur={e => { hasActiveFocusRef.current = false; void handleNumBlur('percent', e.target.value, false) }}
            className={`${cellInput} tabular-nums text-right`} />
        </td>
        <td className="px-1 py-1 w-20">
          <input type="number" min="0" step="any" placeholder="—"
            value={quantity} onChange={e => setQuantity(e.target.value)}
            onFocus={() => { hasActiveFocusRef.current = true }}
            onBlur={e => { hasActiveFocusRef.current = false; void handleNumBlur('quantity', e.target.value, false) }}
            className={`${cellInput} tabular-nums text-right`} />
        </td>
        <td className="px-1 py-1 w-20">
          <input type="number" min="0" step="any" placeholder="—"
            value={minutes} onChange={e => setMinutes(e.target.value)}
            onFocus={() => { hasActiveFocusRef.current = true }}
            onBlur={e => { hasActiveFocusRef.current = false; void handleNumBlur('minutes', e.target.value, false) }}
            className={`${cellInput} tabular-nums text-right`} />
        </td>
        <td className="px-2 py-1 text-sm tabular-nums text-gray-700">{fmtHr(liveHrs?.daily_hrs   ?? null)}</td>
        <td className="px-2 py-1 text-sm tabular-nums text-gray-700">{fmtHr(liveHrs?.weekly_hrs  ?? null)}</td>
        <td className="px-2 py-1 text-sm tabular-nums text-gray-700">{fmtHr(liveHrs?.monthly_hrs ?? null)}</td>
        <td className="px-2 py-1 text-sm font-medium tabular-nums text-gray-900">{fmtHr(liveHrs?.yearly_hrs  ?? null)}</td>
      </tr>
    </>
  )
}

export default function AreaSpreadsheet({
  areas: initialAreas,
  buildingId,
  prospectId,
  isAdmin: _isAdmin,
  taskCodes,
  buildingSqFt,
  positions,
}: {
  areas:        Area[]
  buildingId:   string
  prospectId:   string
  isAdmin:      boolean
  taskCodes:    TaskCodeForForm[]
  buildingSqFt: number | null
  positions:    Pick<Position, 'id' | 'position_name'>[]
}) {
  const [areas, setAreas]               = useState<Area[]>(initialAreas)
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [tasks, setTasks]               = useState<TaskLineItemRow[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [taskCounts, setTaskCounts]     = useState<Record<string, number>>({})
  const [saveError, setSaveError]       = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const pendingDeleteRef = useRef<PendingDelete | null>(null)
  pendingDeleteRef.current = pendingDelete

  const basePath = `/prospects/${prospectId}/buildings/${buildingId}`

  useEffect(() => () => {
    if (pendingDeleteRef.current) clearTimeout(pendingDeleteRef.current.timeoutId)
  }, [])

  useEffect(() => {
    if (!initialAreas.length) return
    const supabase = createClient()
    supabase
      .from('task_line_items')
      .select('area_id')
      .in('area_id', initialAreas.map((a) => a.id))
      .then(({ data }) => {
        if (!data) return
        const counts: Record<string, number> = {}
        for (const row of data) counts[row.area_id] = (counts[row.area_id] ?? 0) + 1
        setTaskCounts(counts)
      })
  }, [initialAreas])

  async function selectArea(id: string) {
    if (selectedId === id) return
    setSelectedId(id)
    setTasks([])
    setLoadingTasks(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('task_line_items')
      .select('*, task_codes(task_code), positions(position_name)')
      .eq('area_id', id)
      .order('created_at')
    setTasks((data ?? []) as unknown as TaskLineItemRow[])
    setLoadingTasks(false)
  }

  async function saveNum(areaId: string, field: keyof AreaPatch, raw: string, isInt: boolean) {
    const trimmed = raw.trim()
    const value: number | null = trimmed === '' ? null : isInt ? parseInt(trimmed, 10) : parseFloat(trimmed)
    if (value !== null && Number.isNaN(value)) return
    setAreas((prev) => prev.map((a) => a.id === areaId ? { ...a, [field]: value } : a))
    const result = await updateAreaField(areaId, { [field]: value } as AreaPatch)
    if (result?.error) setSaveError(result.error)
  }

  async function saveText(areaId: string, raw: string) {
    const value = raw.trim()
    if (!value) return
    setAreas((prev) => prev.map((a) => a.id === areaId ? { ...a, area_name: value } : a))
    const result = await updateAreaField(areaId, { area_name: value })
    if (result?.error) setSaveError(result.error)
  }

  const totals = {
    room_count:    areas.reduce((s, a) => s + (a.room_count    ?? 0), 0),
    carpet_sqft:   areas.reduce((s, a) => s + (a.carpet_sqft   ?? 0), 0),
    tile_vct_sqft: areas.reduce((s, a) => s + (a.tile_vct_sqft ?? 0), 0),
    other_sqft:    areas.reduce((s, a) => s + (a.other_sqft    ?? 0), 0),
    fixtures:      areas.reduce((s, a) => s + (a.fixtures      ?? 0), 0),
    tasks:         Object.values(taskCounts).reduce((s, c) => s + c, 0),
  }
  const totalSqft    = totals.carpet_sqft + totals.tile_vct_sqft + totals.other_sqft
  const selectedArea = areas.find((a) => a.id === selectedId)

  const hasSqftBreakdown = selectedArea != null &&
    (selectedArea.carpet_sqft != null || selectedArea.tile_vct_sqft != null || selectedArea.other_sqft != null)
  const defaultQuantity: number | null = selectedArea == null
    ? null
    : hasSqftBreakdown
      ? (selectedArea.carpet_sqft ?? 0) + (selectedArea.tile_vct_sqft ?? 0) + (selectedArea.other_sqft ?? 0)
      : selectedArea.square_footage ?? null

  function handleTaskCreated(row: TaskLineItemRow) {
    setTasks(prev => [...prev, row])
    setTaskCounts(prev => ({ ...prev, [row.area_id]: (prev[row.area_id] ?? 0) + 1 }))
  }

  function handleTaskUpdated(row: TaskLineItemRow) {
    setTasks(prev => prev.map(t => t.id === row.id ? row : t))
  }

  function handleTaskDelete(taskId: string, taskName: string, areaId: string) {
    const taskToDelete = tasks.find(t => t.id === taskId)!

    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timeoutId)
      const prev = pendingDeleteRef.current
      const prevTask = tasks.find(t => t.id === prev.taskId)!
      setPendingDelete(null)
      setTasks(t => t.filter(r => r.id !== prev.taskId))
      setTaskCounts(c => ({ ...c, [prev.areaId]: Math.max(0, (c[prev.areaId] ?? 0) - 1) }))
      void (async () => {
        const result = await deleteTaskLineItem(prev.taskId, prev.areaId, buildingId, prospectId)
        if (result?.error) {
          setTasks(t => [...t, prevTask])
          setTaskCounts(c => ({ ...c, [prev.areaId]: (c[prev.areaId] ?? 0) + 1 }))
          setSaveError(`Couldn't delete "${prev.taskName}": ${result.error}`)
        }
      })()
    }

    const timeoutId = setTimeout(async () => {
      setPendingDelete(null)
      setTasks(t => t.filter(r => r.id !== taskId))
      setTaskCounts(c => ({ ...c, [areaId]: Math.max(0, (c[areaId] ?? 0) - 1) }))
      const result = await deleteTaskLineItem(taskId, areaId, buildingId, prospectId)
      if (result?.error) {
        setTasks(t => [...t, taskToDelete])
        setTaskCounts(c => ({ ...c, [areaId]: (c[areaId] ?? 0) + 1 }))
        setSaveError(`Couldn't delete "${taskName}": ${result.error}`)
      }
    }, 5000)

    setPendingDelete({ taskId, taskName, areaId, timeoutId })
  }

  function handleUndo() {
    if (!pendingDelete) return
    clearTimeout(pendingDelete.timeoutId)
    setPendingDelete(null)
  }

  const visibleTasks = tasks.filter(t => t.id !== pendingDelete?.taskId)

  function fmt(n: number) { return n > 0 ? n.toLocaleString() : '—' }

  return (
    <div className="space-y-4">
      {saveError && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
          <span>Save failed: {saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-4 text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

      {/* Areas pane */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            Areas
            <span className="ml-1.5 text-xs font-normal text-gray-400">({areas.length})</span>
          </span>
          <Link
            href={`${basePath}/areas/new`}
            className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add Area
          </Link>
        </div>

        {areas.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-400">
            No areas added yet — click &quot;+ Add Area&quot; to get started.
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={`${TH} w-14`}>Order</th>
                  <th className={`${TH} min-w-[10rem]`}>Area Name</th>
                  <th className={`${TH} w-16`}>Rooms</th>
                  <th className={`${TH} w-24`}>Carpet Sq Ft</th>
                  <th className={`${TH} w-28`}>Tile/VCT Sq Ft</th>
                  <th className={`${TH} w-24`}>Other Sq Ft</th>
                  <th className={`${TH} w-24 text-gray-400`}>Total Sq Ft</th>
                  <th className={`${TH} w-16`}>Fix</th>
                  <th className={`${TH} w-16`}>Freq</th>
                  <th className={`${TH} w-12 text-center`}>Tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {areas.map((area) => {
                  const rowTotal   = (area.carpet_sqft ?? 0) + (area.tile_vct_sqft ?? 0) + (area.other_sqft ?? 0)
                  const isSelected = selectedId === area.id
                  return (
                    <tr
                      key={area.id}
                      onClick={() => selectArea(area.id)}
                      className={[
                        'cursor-pointer transition-colors border-l-4',
                        isSelected
                          ? 'bg-blue-50 border-l-blue-500'
                          : 'hover:bg-gray-50 border-l-transparent',
                      ].join(' ')}
                    >
                      <td className={TD}>
                        <input
                          type="number" min="1" step="1"
                          defaultValue={area.print_order ?? ''}
                          placeholder="—"
                          className={`${cellInput} tabular-nums text-right`}
                          onBlur={(e) => saveNum(area.id, 'print_order', e.target.value, true)}
                        />
                      </td>
                      <td className={TD}>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text" maxLength={50}
                            defaultValue={area.area_name}
                            className={cellInput}
                            onBlur={(e) => saveText(area.id, e.target.value)}
                          />
                          {area.notes && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"
                              title={area.notes}
                            />
                          )}
                        </div>
                      </td>
                      <td className={TD}>
                        <input
                          type="number" min="0" step="1"
                          defaultValue={area.room_count ?? ''}
                          placeholder="—"
                          className={`${cellInput} tabular-nums text-right`}
                          onBlur={(e) => saveNum(area.id, 'room_count', e.target.value, true)}
                        />
                      </td>
                      <td className={TD}>
                        <input
                          type="number" min="0" step="any"
                          defaultValue={area.carpet_sqft ?? ''}
                          placeholder="—"
                          className={`${cellInput} tabular-nums text-right`}
                          onBlur={(e) => saveNum(area.id, 'carpet_sqft', e.target.value, false)}
                        />
                      </td>
                      <td className={TD}>
                        <input
                          type="number" min="0" step="any"
                          defaultValue={area.tile_vct_sqft ?? ''}
                          placeholder="—"
                          className={`${cellInput} tabular-nums text-right`}
                          onBlur={(e) => saveNum(area.id, 'tile_vct_sqft', e.target.value, false)}
                        />
                      </td>
                      <td className={TD}>
                        <input
                          type="number" min="0" step="any"
                          defaultValue={area.other_sqft ?? ''}
                          placeholder="—"
                          className={`${cellInput} tabular-nums text-right`}
                          onBlur={(e) => saveNum(area.id, 'other_sqft', e.target.value, false)}
                        />
                      </td>
                      <td className="px-2 py-1 text-right text-sm tabular-nums text-gray-500 pr-3">
                        {rowTotal > 0 ? rowTotal.toLocaleString() : '—'}
                      </td>
                      <td className={TD}>
                        <input
                          type="number" min="0" step="1"
                          defaultValue={area.fixtures ?? ''}
                          placeholder="—"
                          className={`${cellInput} tabular-nums text-right`}
                          onBlur={(e) => saveNum(area.id, 'fixtures', e.target.value, true)}
                        />
                      </td>
                      <td className={TD}>
                        <input
                          type="number" min="1" step="1"
                          defaultValue={area.frequency ?? ''}
                          placeholder="—"
                          className={`${cellInput} tabular-nums text-right`}
                          onBlur={(e) => saveNum(area.id, 'frequency', e.target.value, true)}
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span className="text-xs tabular-nums text-gray-500">
                          {taskCounts[area.id] ?? 0}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Totals</td>
                  <td />
                  <td className="px-2 py-2 text-right text-sm font-semibold tabular-nums text-gray-700">{fmt(totals.room_count)}</td>
                  <td className="px-2 py-2 text-right text-sm font-semibold tabular-nums text-gray-700">{fmt(totals.carpet_sqft)}</td>
                  <td className="px-2 py-2 text-right text-sm font-semibold tabular-nums text-gray-700">{fmt(totals.tile_vct_sqft)}</td>
                  <td className="px-2 py-2 text-right text-sm font-semibold tabular-nums text-gray-700">{fmt(totals.other_sqft)}</td>
                  <td className="px-2 py-2 text-right text-sm font-semibold tabular-nums text-gray-700 pr-3">{fmt(totalSqft)}</td>
                  <td className="px-2 py-2 text-right text-sm font-semibold tabular-nums text-gray-700">{fmt(totals.fixtures)}</td>
                  <td />
                  <td className="px-2 py-2 text-center text-sm font-semibold tabular-nums text-gray-700">{fmt(totals.tasks)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-6 flex-wrap text-xs text-gray-400">
            {(buildingSqFt ?? 0) > 0 && (
              <span>Building Total: <span className="tabular-nums text-gray-500">{buildingSqFt!.toLocaleString()}</span></span>
            )}
            <span>Cleanable from Areas: <span className="tabular-nums text-gray-500">{totalSqft.toLocaleString()}</span></span>
            {(buildingSqFt ?? 0) > 0 && (
              <span>Non-cleanable: <span className="tabular-nums text-gray-500">{(buildingSqFt! - totalSqft).toLocaleString()}</span></span>
            )}
            {(buildingSqFt ?? 0) > 0 && totalSqft > buildingSqFt! && (
              <span className="italic">Areas exceed building total — verify entries</span>
            )}
          </div>
          </>
        )}
      </div>

      {/* Task pane */}
      {areas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">
              {selectedArea ? (
                <>Tasks &mdash; <span className="font-normal text-gray-600">{selectedArea.area_name}</span></>
              ) : 'Tasks'}
            </span>
          </div>

          {!selectedId ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Select an area above to view its tasks.
            </div>
          ) : loadingTasks ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Loading…</div>
          ) : (
            <div>
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Code', 'Task Name', 'Position', 'Freq', '%', 'Qty', 'Min/unit', 'Daily Hrs', 'Weekly Hrs', 'Monthly Hrs', 'Yearly Hrs'].map((h) => (
                      <th key={h} className={TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleTasks.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-6 text-center text-sm text-gray-400">
                        No tasks for this area.
                      </td>
                    </tr>
                  ) : (
                    visibleTasks.map((task) => (
                      <SavedTaskRow
                        key={task.id}
                        task={task}
                        taskCodes={taskCodes}
                        positions={positions}
                        onUpdated={handleTaskUpdated}
                        onDelete={handleTaskDelete}
                      />
                    ))
                  )}
                  <InlineTaskRow
                    key={selectedId}
                    areaId={selectedId!}
                    taskCodes={taskCodes}
                    positions={positions}
                    defaultFrequency={selectedArea?.frequency ?? null}
                    defaultQuantity={defaultQuantity}
                    onCreated={handleTaskCreated}
                  />
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {pendingDelete && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
          <span>&ldquo;{pendingDelete.taskName}&rdquo; deleted</span>
          <button
            onClick={handleUndo}
            className="px-2 py-0.5 bg-white/15 hover:bg-white/25 rounded text-xs font-semibold whitespace-nowrap transition-colors"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
