'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createArea, updateArea, type ActionState } from './actions'
import type { Area } from '@/types/area'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

export default function AreaForm({
  area,
  buildingId,
  prospectId,
}: {
  area?: Area
  buildingId: string
  prospectId: string
}) {
  const action = area
    ? updateArea.bind(null, area.id, buildingId, prospectId)
    : createArea.bind(null, buildingId, prospectId)

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null)

  const cancelHref = `/prospects/${prospectId}/buildings/${buildingId}`

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Area Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Area Name <span className="text-red-500">*</span>
            </label>
            <input
              name="area_name"
              type="text"
              required
              maxLength={50}
              defaultValue={area?.area_name ?? ''}
              placeholder="e.g. Lobby"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">Max 50 characters</p>
          </div>

          <div>
            <label className={labelClass}>Frequency <span className="text-gray-400 font-normal">(times/year)</span></label>
            <input
              name="frequency"
              type="number"
              min="1"
              step="1"
              defaultValue={area?.frequency ?? ''}
              placeholder="e.g. 52"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">
              365=daily · 260=5x/wk · 156=3x/wk · 104=2x/wk · 52=1x/wk · 26=1x/2wks · 12=1x/mo · 4=4x/yr · 2=2x/yr · 1=1x/yr
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Square Footage</label>
            <input
              name="square_footage"
              type="number"
              min="0"
              step="any"
              defaultValue={area?.square_footage ?? ''}
              placeholder="e.g. 2500"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Print Order</label>
            <input
              name="print_order"
              type="number"
              min="1"
              step="1"
              defaultValue={area?.print_order ?? ''}
              placeholder="e.g. 1"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">Controls report output order</p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</h2>
        <textarea
          name="notes"
          rows={3}
          maxLength={255}
          defaultValue={area?.notes ?? ''}
          placeholder="Any additional notes about this area..."
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
          {isPending ? 'Saving...' : area ? 'Save Changes' : 'Add Area'}
        </button>
        <Link href={cancelHref} className="text-sm font-medium text-gray-600 hover:text-gray-800">
          Cancel
        </Link>
      </div>
    </form>
  )
}
