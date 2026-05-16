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
              maxLength={18}
              defaultValue={position?.position_code ?? ''}
              placeholder="e.g. DAY1"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">Max 18 characters — auto-uppercased</p>
          </div>

          <div>
            <label className={labelClass}>
              Position Name <span className="text-red-500">*</span>
            </label>
            <input
              name="position_name"
              type="text"
              required
              maxLength={18}
              defaultValue={position?.position_name ?? ''}
              placeholder="e.g. Day Cleaner"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">Max 18 characters</p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</h2>
        <textarea
          name="description"
          rows={4}
          maxLength={255}
          defaultValue={position?.description ?? ''}
          placeholder="Optional description of duties and responsibilities..."
          className={inputClass}
        />
        <p className="text-xs text-gray-400">Max 255 characters</p>
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
