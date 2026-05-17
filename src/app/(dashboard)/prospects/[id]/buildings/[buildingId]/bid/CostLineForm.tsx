'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import type { ActionState } from './actions'
import type { BidLaborCost, BidOtherCost } from '@/types/bid'
import { COST_TYPE_LABELS, calcCostLine } from '@/types/bid'
import type { CostType } from '@/types/bid'

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

type CostLineItem = Pick<BidLaborCost | BidOtherCost, 'description' | 'type' | 'factor'>

export default function CostLineForm({
  item,
  action,
  cancelHref,
  sectionLabel,
  totalLabor,
  totalHours,
}: {
  item?:         CostLineItem
  action:        (prev: ActionState, fd: FormData) => Promise<ActionState>
  cancelHref:    string
  sectionLabel:  string
  totalLabor:    number
  totalHours:    number
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null)

  const [type,   setType]   = useState<CostType>((item?.type as CostType) ?? 'per_year')
  const [factor, setFactor] = useState(item?.factor != null ? String(item.factor) : '')

  const preview = calcCostLine(type, parseFloat(factor) || null, totalLabor, totalHours)

  const factorLabel =
    type === 'percent_markup' ? 'Factor (%)'
    : type === 'per_hour'     ? 'Factor ($/hr)'
    : 'Factor ($/yr)'

  const factorPlaceholder =
    type === 'percent_markup' ? 'e.g. 15'
    : type === 'per_hour'     ? 'e.g. 2.50'
    : 'e.g. 5000'

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{sectionLabel}</h2>

        <div>
          <label className={labelClass}>Description</label>
          <input
            name="description"
            type="text"
            defaultValue={item?.description ?? ''}
            placeholder="e.g. Payroll Taxes"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Type</label>
            <select
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as CostType)}
              className={inputClass}
            >
              {(Object.entries(COST_TYPE_LABELS) as [CostType, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{factorLabel}</label>
            <input
              name="factor"
              type="number"
              min="0"
              step="any"
              value={factor}
              onChange={(e) => setFactor(e.target.value)}
              placeholder={factorPlaceholder}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Calculated */}
      <section className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Calculated</h2>
        <div>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Annual Cost</dt>
          <dd className="mt-0.5 text-lg font-semibold text-gray-900">
            {preview > 0
              ? preview.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
              : '—'}
          </dd>
          <p className="text-xs text-gray-400 mt-1">
            {type === 'percent_markup'
              ? `${factor || 0}% × Total Labor ($${totalLabor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
              : type === 'per_hour'
              ? `$${factor || 0}/hr × ${totalHours.toLocaleString()} total hours`
              : 'Fixed annual amount'}
          </p>
        </div>
      </section>

      <div className="flex items-center gap-3 pb-6">
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {isPending ? 'Saving...' : item ? 'Save Changes' : 'Add Cost'}
        </button>
        <Link href={cancelHref} className="text-sm font-medium text-gray-600 hover:text-gray-800">
          Cancel
        </Link>
      </div>
    </form>
  )
}
