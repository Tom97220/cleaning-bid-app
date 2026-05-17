'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createLaborCostType, updateLaborCostType, type ActionState } from './actions'
import type { LaborCostType } from '@/types/cost-type-lookup'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

export default function LaborCostTypeForm({ item }: { item?: LaborCostType }) {
  const action = item ? updateLaborCostType.bind(null, item.id) : createLaborCostType
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null)

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Labor Cost Type</h2>
        <div>
          <label className={labelClass}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            maxLength={50}
            defaultValue={item?.name ?? ''}
            placeholder="e.g. Payroll Taxes"
            className={inputClass}
          />
          <p className="text-xs text-gray-400 mt-1">Max 50 characters</p>
        </div>
      </section>

      <div className="flex items-center gap-3 pb-6">
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {isPending ? 'Saving...' : item ? 'Save Changes' : 'Create Type'}
        </button>
        <Link href="/admin/labor-cost-types" className="text-sm font-medium text-gray-600 hover:text-gray-800">
          Cancel
        </Link>
      </div>
    </form>
  )
}
