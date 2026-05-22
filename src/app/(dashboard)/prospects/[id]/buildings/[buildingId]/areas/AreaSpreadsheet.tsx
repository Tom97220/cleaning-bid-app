'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { updateAreaField, type AreaPatch } from './actions'
import { createTaskLineItemInline, type InlineTaskData } from './[areaId]/task-line-items/actions'
import type { Area } from '@/types/area'
import type { TaskCodeForForm, TaskLineItemRow } from '@/types/task-line-item'
import SearchableSelect, { type SelectOption } from '@/components/ui/SearchableSelect'

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
}: {
  areaId:           string
  taskCodes:        TaskCodeForForm[]
  defaultFrequency: number | null
  defaultQuantity:  number | null
  onCreated:        (row: TaskLineItemRow) => void
}) {
  const [taskCodeId, setTaskCodeId]   = useState('')
  const [taskName, setTaskName]       = useState('')
  const [frequency, setFrequency]     = useState(defaultFrequency != null ? String(defaultFrequency) : '')
  const [percent, setPercent]         = useState('100')
  const [quantity, setQuantity]       = useState(defaultQuantity != null ? String(defaultQuantity) : '')
  const [minutes, setMinutes]         = useState('')
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [resetKey, setResetKey]       = useState(0)

  const taskNameRef       = useRef<HTMLInputElement>(null)
  const hasActiveFocusRef = useRef(false)
  const pendingCreateRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef        = useRef(true)
  const valuesRef         = useRef({ taskCodeId, taskName, frequency, percent, quantity, minutes })
  valuesRef.current = { taskCodeId, taskName, frequency, percent, quantity, minutes }

  useEffect(() => () => {
    mountedRef.current = false
    if (pendingCreateRef.current) clearTimeout(pendingCreateRef.current)
  }, [])

  const codeOptions: SelectOption[] = taskCodes.map(tc => ({
    value:      tc.id,
    label:      tc.task_code,
    searchText: `${tc.task_code} ${tc.task_name}`,
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
        position_id:  tc?.position_id  ?? null,
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
      }
      setTimeout(() => taskNameRef.current?.focus(), 160)
    }
  }

  if (creating) {
    return (
      <tr className="border-t border-dashed border-gray-200">
        <td colSpan={8} className="px-4 py-2 text-center text-xs text-gray-400 italic">Saving…</td>
      </tr>
    )
  }

  return (
    <>
      {createError && (
        <tr>
          <td colSpan={8} className="px-3 py-1">
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
        <td className="px-2 py-1 text-xs text-gray-400 italic">—</td>
        <td className="px-2 py-1 text-xs text-gray-400">Tab to save</td>
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
}: {
  areas:        Area[]
  buildingId:   string
  prospectId:   string
  isAdmin:      boolean
  taskCodes:    TaskCodeForForm[]
  buildingSqFt: number | null
}) {
  const [areas, setAreas]               = useState<Area[]>(initialAreas)
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [tasks, setTasks]               = useState<TaskLineItemRow[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [taskCounts, setTaskCounts]     = useState<Record<string, number>>({})
  const [saveError, setSaveError]       = useState<string | null>(null)

  const basePath = `/prospects/${prospectId}/buildings/${buildingId}`

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
            {buildingSqFt && (
              <span>Building Total: <span className="tabular-nums text-gray-500">{buildingSqFt.toLocaleString()}</span></span>
            )}
            <span>Cleanable from Areas: <span className="tabular-nums text-gray-500">{totalSqft.toLocaleString()}</span></span>
            {buildingSqFt && (
              <span>Non-cleanable: <span className="tabular-nums text-gray-500">{(buildingSqFt - totalSqft).toLocaleString()}</span></span>
            )}
            {buildingSqFt && totalSqft > buildingSqFt && (
              <span className="italic">Areas exceed building total — verify entries</span>
            )}
          </div>
          </>
        )}
      </div>

      {/* Task pane */}
      {areas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              {selectedArea ? (
                <>Tasks &mdash; <span className="font-normal text-gray-600">{selectedArea.area_name}</span></>
              ) : 'Tasks'}
            </span>
            {selectedId && (
              <Link
                href={`${basePath}/areas/${selectedId}/task-line-items/new`}
                className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                + Add Task
              </Link>
            )}
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
                    {['Code', 'Task Name', 'Freq', '%', 'Qty', 'Min/unit', 'Yearly Hrs', ''].map((h) => (
                      <th key={h} className={TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-400">
                        No tasks for this area.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-2 py-2 text-xs font-mono text-gray-500 whitespace-nowrap">
                          {task.task_codes?.task_code ?? '—'}
                        </td>
                        <td className="px-2 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {task.task_name}
                        </td>
                        <td className="px-2 py-2 text-sm tabular-nums text-gray-700">
                          {task.frequency ?? '—'}
                        </td>
                        <td className="px-2 py-2 text-sm tabular-nums text-gray-700">
                          {task.percent}%
                        </td>
                        <td className="px-2 py-2 text-sm tabular-nums text-gray-700">
                          {task.quantity != null ? task.quantity.toLocaleString() : '—'}
                        </td>
                        <td className="px-2 py-2 text-sm tabular-nums text-gray-700 whitespace-nowrap">
                          {task.minutes != null ? task.minutes.toLocaleString() : '—'}
                          {task.measure && (
                            <span className="ml-1 text-xs text-gray-400">
                              {task.measure === 'sqft_per_hour' ? 'sf/hr' : 'min/u'}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-sm font-medium tabular-nums text-gray-900">
                          {task.yearly_hrs != null ? task.yearly_hrs.toFixed(2) : '—'}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <Link
                            href={`${basePath}/areas/${selectedId}/task-line-items/${task.id}/edit`}
                            className="text-sm text-brand-600 hover:text-brand-800 font-medium"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                  <InlineTaskRow
                    key={selectedId}
                    areaId={selectedId!}
                    taskCodes={taskCodes}
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
    </div>
  )
}
