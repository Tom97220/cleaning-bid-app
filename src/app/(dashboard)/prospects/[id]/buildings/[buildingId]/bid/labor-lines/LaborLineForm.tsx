'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { createLaborLine, updateLaborLine, type ActionState } from '../actions'
import type { BidLaborLine } from '@/types/bid'
import { calcPositionCost } from '@/types/bid'

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

interface PositionOption {
  id:            string
  position_name: string
}

export default function LaborLineForm({
  item,
  buildingId,
  prospectId,
  positions,
}: {
  item?:      BidLaborLine
  buildingId: string
  prospectId: string
  positions:  PositionOption[]
}) {
  const action = item
    ? updateLaborLine.bind(null, item.id, buildingId, prospectId)
    : createLaborLine.bind(null, buildingId, prospectId)

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null)

  const [annualHours, setAnnualHours] = useState(item?.annual_hours != null ? String(item.annual_hours) : '')
  const [rate,        setRate]        = useState(item?.rate != null ? String(item.rate) : '')

  const cost = calcPositionCost(
    parseFloat(annualHours) || null,
    parseFloat(rate) || null,
  )

  const cancelHref = `/prospects/${prospectId}/buildings/${buildingId}/bid`
  const positionOptions = positions.map((p) => ({ value: p.id, label: p.position_name }))

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Labor Line</h2>

        <div>
          <label className={labelClass}>Position</label>
          <SearchableSelect
            name="position_id"
            options={positionOptions}
            defaultValue={item?.position_id ?? null}
            placeholder="Search positions..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Annual Hours</label>
            <input
              name="annual_hours"
              type="number"
              min="0"
              step="any"
              value={annualHours}
              onChange={(e) => setAnnualHours(e.target.value)}
              placeholder="e.g. 2080"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Rate ($/hr)</label>
            <input
              name="rate"
              type="number"
              min="0"
              step="any"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 18.50"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Calculated</h2>
        <div>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Annual Cost</dt>
          <dd className="mt-0.5 text-lg font-semibold text-gray-900">
            {cost > 0
              ? cost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
              : '—'}
          </dd>
          <p className="text-xs text-gray-400 mt-1">Annual Hours × Rate</p>
        </div>
      </section>

      <div className="flex items-center gap-3 pb-6">
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {isPending ? 'Saving...' : item ? 'Save Changes' : 'Add Labor Line'}
        </button>
        <Link href={cancelHref} className="text-sm font-medium text-gray-600 hover:text-gray-800">
          Cancel
        </Link>
      </div>
    </form>
  )
}
