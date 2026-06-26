'use client'

import { useActionState, useState, useTransition } from 'react'
import Link from 'next/link'
import { createBuilding, updateBuilding, countTasksAtFrequency, updateBuildingAndTaskFrequency, type ActionState } from './actions'
import type { Building } from '@/types/building'
import SearchableSelect from '@/components/ui/SearchableSelect'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

export default function BuildingForm({
  building,
  prospectId,
  buildingTypes,
}: {
  building?: Building
  prospectId: string
  buildingTypes: { id: string; type_name: string }[]
}) {
  const action = building
    ? updateBuilding.bind(null, building.id, prospectId)
    : createBuilding.bind(null, prospectId)

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null)

  const buildingTypeOptions = buildingTypes.map((t) => ({ value: t.id, label: t.type_name }))

  const [dialog, setDialog] = useState<{
    oldDays: number; newDays: number; count: number; formData: FormData
  } | null>(null)
  const [checking,    setChecking]    = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const newDays = parseInt(fd.get('service_days') as string, 10) || 260
    if (building && newDays !== building.service_days) {
      setChecking(true)
      const count = await countTasksAtFrequency(building.id, building.service_days)
      setChecking(false)
      if (count > 0) {
        setDialog({ oldDays: building.service_days, newDays, count, formData: fd })
        return
      }
    }
    startTransition(() => formAction(fd))
  }

  async function handleDialogYes() {
    if (!dialog || !building) return
    setSubmitting(true)
    setDialogError(null)
    const result = await updateBuildingAndTaskFrequency(
      building.id, prospectId, dialog.oldDays, dialog.newDays, dialog.formData
    )
    setSubmitting(false)
    if (result?.error) setDialogError(result.error)
  }

  function handleDialogNo() {
    if (!dialog) return
    const fd = dialog.formData
    setDialog(null)
    startTransition(() => formAction(fd))
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Identity */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Building Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Building Name <span className="text-red-500">*</span>
            </label>
            <input
              name="building_name"
              type="text"
              required
              maxLength={50}
              defaultValue={building?.building_name ?? ''}
              placeholder="e.g. Main Office"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">Max 50 characters</p>
          </div>
          <div>
            <label className={labelClass}>Building Type</label>
            <SearchableSelect
              name="building_type_id"
              options={buildingTypeOptions}
              defaultValue={building?.building_type_id}
              placeholder="Search building types..."
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Square Feet</label>
            <input
              name="square_feet"
              type="number"
              min="0"
              step="any"
              defaultValue={building?.square_feet ?? ''}
              placeholder="e.g. 25000"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Floors</label>
            <input
              name="floors"
              type="number"
              min="1"
              step="1"
              defaultValue={building?.floors ?? ''}
              placeholder="e.g. 3"
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Common Area Sq Ft</label>
            <input
              name="common_sqft"
              type="number"
              min="0"
              step="any"
              defaultValue={building?.common_sqft ?? ''}
              placeholder="e.g. 4000"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Number of Restrooms</label>
            <input
              name="num_restrooms"
              type="number"
              min="0"
              step="1"
              defaultValue={building?.num_restrooms ?? ''}
              placeholder="e.g. 6"
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Service Days per Year</label>
          <input
            name="service_days"
            type="number"
            min="1"
            step="1"
            defaultValue={building?.service_days ?? 260}
            placeholder="e.g. 260"
            className={inputClass}
          />
          <p className="text-xs text-gray-400 mt-1">
            Number of cleaning service days per year (e.g. 260 for 5 days/week, 156 for 3 days/week, 365 for daily service)
          </p>
        </div>
      </section>

      {/* Address */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Street Address</label>
            <input
              name="address"
              type="text"
              defaultValue={building?.address ?? ''}
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Address 2</label>
            <input
              name="address_2"
              type="text"
              defaultValue={building?.address_2 ?? ''}
              placeholder="Suite, floor, unit, etc."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input
              name="city"
              type="text"
              defaultValue={building?.city ?? ''}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>State</label>
              <select
                name="state"
                defaultValue={building?.state ?? ''}
                className={inputClass}
              >
                <option value="">--</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>ZIP</label>
              <input
                name="zip"
                type="text"
                maxLength={10}
                defaultValue={building?.zip ?? ''}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Directions & Notes */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Directions & Notes</h2>
        <div>
          <label className={labelClass}>Directions</label>
          <textarea
            name="directions"
            rows={3}
            defaultValue={building?.directions ?? ''}
            placeholder="Parking, entrance instructions, access codes..."
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={building?.notes ?? ''}
            placeholder="Any additional notes about this building..."
            className={inputClass}
          />
        </div>
      </section>

      <div className="flex items-center gap-3 pb-6">
        <button
          type="submit"
          disabled={isPending || checking}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {checking ? 'Checking…' : isPending ? 'Saving…' : building ? 'Save Changes' : 'Add Building'}
        </button>
        <Link
          href={`/prospects/${prospectId}`}
          className="text-sm font-medium text-gray-600 hover:text-gray-800"
        >
          Cancel
        </Link>
      </div>
    </form>

    {dialog && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={() => { if (!submitting) { setDialog(null); setDialogError(null) } }}
      >
        <div
          className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Update task frequencies?</h2>
            <button
              type="button"
              onClick={() => { if (!submitting) { setDialog(null); setDialogError(null) } }}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            You&apos;re changing Service Days from <strong>{dialog.oldDays}</strong> to{' '}
            <strong>{dialog.newDays}</strong>. There {dialog.count === 1 ? 'is' : 'are'}{' '}
            <strong>{dialog.count}</strong> task line item{dialog.count === 1 ? '' : 's'} currently
            set to frequency {dialog.oldDays} across all areas of this building.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Update {dialog.count === 1 ? 'that task' : `those ${dialog.count} tasks`} to
            frequency {dialog.newDays} too?
          </p>
          {dialogError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
              {dialogError}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDialogYes}
              disabled={submitting}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Yes, update them'}
            </button>
            <button
              type="button"
              onClick={handleDialogNo}
              disabled={submitting}
              className="bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              No, leave them as-is
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
