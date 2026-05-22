'use client'

import { useActionState, useState } from 'react'
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

  const [carpetSqft,  setCarpetSqft]  = useState<number | null>(area?.carpet_sqft   ?? null)
  const [tileVctSqft, setTileVctSqft] = useState<number | null>(area?.tile_vct_sqft ?? null)
  const [otherSqft,   setOtherSqft]   = useState<number | null>(area?.other_sqft    ?? null)
  const totalSqft    = (carpetSqft ?? 0) + (tileVctSqft ?? 0) + (otherSqft ?? 0)
  const hasTotalSqft = carpetSqft != null || tileVctSqft != null || otherSqft != null

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
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Floor &amp; Fixtures</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Room Count</label>
            <input
              name="room_count"
              type="number"
              min="0"
              step="1"
              defaultValue={area?.room_count ?? ''}
              placeholder="e.g. 22"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">Number of rooms in this area</p>
          </div>
          <div>
            <label className={labelClass}>Fixtures</label>
            <input
              name="fixtures"
              type="number"
              min="0"
              step="1"
              defaultValue={area?.fixtures ?? ''}
              placeholder="e.g. 8"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">Total fixture count</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Carpet Sq Ft</label>
            <input
              name="carpet_sqft"
              type="number"
              min="0"
              step="any"
              defaultValue={area?.carpet_sqft ?? ''}
              placeholder="0"
              className={inputClass}
              onChange={(e) => setCarpetSqft(e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>
          <div>
            <label className={labelClass}>Tile / VCT Sq Ft</label>
            <input
              name="tile_vct_sqft"
              type="number"
              min="0"
              step="any"
              defaultValue={area?.tile_vct_sqft ?? ''}
              placeholder="0"
              className={inputClass}
              onChange={(e) => setTileVctSqft(e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>
          <div>
            <label className={labelClass}>Other Sq Ft</label>
            <input
              name="other_sqft"
              type="number"
              min="0"
              step="any"
              defaultValue={area?.other_sqft ?? ''}
              placeholder="0"
              className={inputClass}
              onChange={(e) => setOtherSqft(e.target.value ? parseFloat(e.target.value) : null)}
            />
            <p className="text-xs text-gray-400 mt-1">Concrete, wood, rubber, etc.</p>
          </div>
          <div>
            <label className={labelClass}>Total Sq Ft</label>
            <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 tabular-nums">
              {hasTotalSqft ? totalSqft.toLocaleString() : '—'}
            </div>
            <p className="text-xs text-gray-400 mt-1">Carpet + Tile/VCT + Other</p>
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
