'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createPosition, updatePosition, type ActionState } from './actions'
import type { Position } from '@/types/position'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

export default function PositionForm({ position }: { position?: Position }) {
  const action = position
    ? updatePosition.bind(null, position.id)
    : createPosition

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null)

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Position Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Position Code <span className="text-red-500">*</span>
            </label>
            <input
              name="position_code"
              type="text"
              required
              defaultValue={position?.position_code ?? ''}
              placeholder="e.g. DAY1"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">Unique identifier — auto-uppercased</p>
          </div>

          <div>
            <label className={labelClass}>
              Position Type <span className="text-red-500">*</span>
            </label>
            <select
              name="position_type"
              required
              defaultValue={position?.position_type ?? ''}
              className={inputClass}
            >
              <option value="">Select type...</option>
              <option value="day">Day</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className={labelClass}>
              Position Name <span className="text-red-500">*</span>
            </label>
            <input
              name="position_name"
              type="text"
              required
              defaultValue={position?.position_name ?? ''}
              placeholder="e.g. Day Cleaner"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Base Hourly Rate ($) <span className="text-red-500">*</span>
            </label>
            <input
              name="base_hourly_rate"
              type="number"
              required
              min="0"
              step="0.01"
              defaultValue={position?.base_hourly_rate ?? '0.00'}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</h2>
        <textarea
          name="description"
          rows={4}
          defaultValue={position?.description ?? ''}
          placeholder="Optional description of duties and responsibilities..."
          className={inputClass}
        />
      </section>

      <div className="flex items-center gap-3 pb-6">
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {isPending ? 'Saving...' : position ? 'Save Changes' : 'Create Position'}
        </button>
        <Link href="/positions" className="text-sm font-medium text-gray-600 hover:text-gray-800">
          Cancel
        </Link>
      </div>
    </form>
  )
}
