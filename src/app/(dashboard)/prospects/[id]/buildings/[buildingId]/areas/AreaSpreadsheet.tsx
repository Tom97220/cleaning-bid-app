'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { updateAreaField, type AreaPatch } from './actions'
import type { Area } from '@/types/area'
import type { TaskLineItemRow } from '@/types/task-line-item'

const TH = 'px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap select-none'
const TD = 'px-1 py-0.5'
const cellInput = [
  'block w-full bg-transparent text-sm',
  'px-1.5 py-1 rounded',
  'focus:outline-none focus:ring-1 focus:ring-inset focus:ring-brand-500 focus:bg-white',
  'hover:bg-white hover:ring-1 hover:ring-gray-200',
].join(' ')

export default function AreaSpreadsheet({
  areas: initialAreas,
  buildingId,
  prospectId,
  isAdmin: _isAdmin,
}: {
  areas:      Area[]
  buildingId: string
  prospectId: string
  isAdmin:    boolean
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
        )}
      </div>

      {/* Task pane */}
      {areas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
            <div className="overflow-x-auto">
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
                  <tr className="border-t border-dashed border-gray-200">
                    <td colSpan={8}>
                      <Link
                        href={`${basePath}/areas/${selectedId}/task-line-items/new`}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-brand-600 transition-colors"
                      >
                        <span className="text-base leading-none">+</span>
                        <span>Add task</span>
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
