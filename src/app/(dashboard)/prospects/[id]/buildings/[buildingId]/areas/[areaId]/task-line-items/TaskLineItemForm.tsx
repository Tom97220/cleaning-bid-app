'use client'

import { useActionState, useState, useMemo } from 'react'
import Link from 'next/link'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { createTaskLineItem, updateTaskLineItem, type ActionState } from './actions'
import type { TaskLineItem, TaskCodeForForm } from '@/types/task-line-item'
import { calculateHours } from '@/types/task-line-item'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

interface PositionOption {
  id:            string
  position_name: string
}

export default function TaskLineItemForm({
  item,
  areaId,
  buildingId,
  prospectId,
  taskCodes,
  positions,
  defaultFrequency,
  defaultQuantity,
}: {
  item?:            TaskLineItem
  areaId:           string
  buildingId:       string
  prospectId:       string
  taskCodes:        TaskCodeForForm[]
  positions:        PositionOption[]
  defaultFrequency: number | null
  defaultQuantity:  number | null
}) {
  const action = item
    ? updateTaskLineItem.bind(null, item.id, areaId, buildingId, prospectId)
    : createTaskLineItem.bind(null, areaId, buildingId, prospectId)

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null)

  const [taskName,    setTaskName]    = useState(item?.task_name ?? '')
  const [positionId,  setPositionId]  = useState(item?.position_id ?? '')
  const [positionKey, setPositionKey] = useState(0)
  const [frequency,   setFrequency]   = useState(
    item?.frequency != null ? String(item.frequency)
      : defaultFrequency != null ? String(defaultFrequency) : ''
  )
  const [quantity,    setQuantity]    = useState(
    item?.quantity != null ? String(item.quantity)
      : defaultQuantity != null ? String(defaultQuantity) : ''
  )
  const [minutes,     setMinutes]     = useState(item?.minutes != null ? String(item.minutes) : '')
  const [percent,     setPercent]     = useState(String(item?.percent ?? 100))
  const [measure,     setMeasure]     = useState(item?.measure ?? '')
  const [type,        setType]        = useState(item?.type ?? '')
  const [print,       setPrint]       = useState(item?.print ?? true)
  const [isBothCode,  setIsBothCode]  = useState(false)
  const [basis,       setBasis]       = useState('')
  const [bothRates,   setBothRates]   = useState<{ sqft: number | null; each: number | null } | null>(null)

  const taskCodeMap = useMemo(() => {
    const m: Record<string, TaskCodeForForm> = {}
    for (const tc of taskCodes) m[tc.id] = tc
    return m
  }, [taskCodes])

  function handleTaskCodeSelect(id: string) {
    const tc = taskCodeMap[id]
    if (!tc) return
    setTaskName(tc.task_name)
    setPositionId(tc.position_id ?? '')
    setPositionKey((k) => k + 1)
    setType(tc.task_types?.type_name ?? '')

    if (tc.unit_of_measure === 'both') {
      const rates = { sqft: tc.production_rate, each: tc.rate_each }
      setBothRates(rates)
      setIsBothCode(true)
      const initialBasis = tc.default_basis ?? 'sqft_per_hour'
      setBasis(initialBasis)
      applyBasisRates(rates, initialBasis)
    } else {
      setIsBothCode(false)
      setBothRates(null)
      setBasis('')
      setMinutes(tc.production_rate != null ? String(tc.production_rate) : '')
      setMeasure(tc.unit_of_measure)
    }
  }

  function applyBasisRates(rates: { sqft: number | null; each: number | null }, selectedBasis: string) {
    if (selectedBasis === 'sqft_per_hour') {
      setMeasure('sqft_per_hour')
      setMinutes(rates.sqft != null ? String(rates.sqft) : '')
      if (defaultQuantity != null) setQuantity(String(defaultQuantity))
    } else {
      setMeasure('minutes_per_unit')
      setMinutes(rates.each != null ? String(rates.each) : '')
      setQuantity('')
    }
  }

  function handleBasisChange(newBasis: string) {
    setBasis(newBasis)
    if (bothRates) applyBasisRates(bothRates, newBasis)
  }

  const hours = calculateHours(
    measure || null,
    parseFloat(quantity) || null,
    parseFloat(minutes) || null,
    parseInt(frequency, 10) || null,
    parseFloat(percent) || 100,
  )

  const taskCodeOptions = useMemo(
    () =>
      taskCodes.map((tc) => ({
        value:      tc.id,
        label:      `${tc.task_code} – ${tc.task_name}`,
        searchText: `${tc.task_code} ${tc.task_name} ${tc.task_types?.type_name ?? ''} ${tc.description ?? ''}`,
      })),
    [taskCodes],
  )

  const positionOptions = useMemo(
    () => positions.map((p) => ({ value: p.id, label: p.position_name })),
    [positions],
  )

  const rateLabel =
    measure === 'sqft_per_hour' ? 'Sq ft/hr'
    : measure === 'minutes_per_unit' ? 'Min/unit'
    : 'Rate'

  const cancelHref = `/prospects/${prospectId}/buildings/${buildingId}/areas/${areaId}`

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <input type="hidden" name="print" value={print ? 'true' : 'false'} />

      {/* Task */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Task</h2>

        <div>
          <label className={labelClass}>Task Code</label>
          <SearchableSelect
            name="task_code_id"
            options={taskCodeOptions}
            defaultValue={item?.task_code_id ?? null}
            placeholder="Search by code, name, or description..."
            onSelect={handleTaskCodeSelect}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Task Name <span className="text-red-500">*</span>
            </label>
            <input
              name="task_name"
              type="text"
              required
              value={taskName}
              readOnly
              className={`${inputClass} bg-gray-50 cursor-default focus:ring-0`}
            />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <input
              name="type"
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. Janitorial"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Position</label>
          <SearchableSelect
            key={positionKey}
            name="position_id"
            options={positionOptions}
            defaultValue={positionId || null}
            placeholder="Search positions..."
          />
        </div>
      </section>

      {/* Scope & Schedule */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scope & Schedule</h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Frequency <span className="text-gray-400 font-normal">(x/yr)</span></label>
            <input
              name="frequency"
              type="number"
              min="1"
              step="1"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="e.g. 52"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Percent %</label>
            <input
              name="percent"
              type="number"
              min="0"
              max="100"
              step="any"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Quantity</label>
            <input
              name="quantity"
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 2500"
              className={inputClass}
            />
          </div>
        </div>

        {isBothCode && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Basis <span className="text-red-500">*</span>
              </label>
              <select
                value={basis}
                onChange={(e) => handleBasisChange(e.target.value)}
                className={inputClass}
              >
                <option value="sqft_per_hour">Sq Ft per Hour</option>
                <option value="minutes_per_unit">Minutes per Each</option>
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Measure</label>
            <select
              name="measure"
              value={measure}
              onChange={(e) => setMeasure(e.target.value)}
              className={inputClass}
            >
              <option value="">— Select —</option>
              <option value="sqft_per_hour">Sq ft per hour</option>
              <option value="minutes_per_unit">Minutes per unit</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{rateLabel}</label>
            <input
              name="minutes"
              type="number"
              min="0"
              step="any"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder={measure === 'sqft_per_hour' ? 'e.g. 2000' : 'e.g. 5'}
              className={inputClass}
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={print}
                onChange={(e) => setPrint(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm font-medium text-gray-700">Include in print</span>
            </label>
          </div>
        </div>
      </section>

      {/* Calculated Hours */}
      <section className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Calculated Hours</h2>
        <dl className="grid grid-cols-4 gap-4">
          {[
            { label: 'Yearly Hrs',  value: hours.yearly_hrs },
            { label: 'Monthly Hrs', value: hours.monthly_hrs },
            { label: 'Weekly Hrs',  value: hours.weekly_hrs },
            { label: 'Daily Hrs',   value: hours.daily_hrs },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                {value != null ? value.toFixed(2) : '—'}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex items-center gap-3 pb-6">
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {isPending ? 'Saving...' : item ? 'Save Changes' : 'Add Task'}
        </button>
        <Link href={cancelHref} className="text-sm font-medium text-gray-600 hover:text-gray-800">
          Cancel
        </Link>
      </div>
    </form>
  )
}
