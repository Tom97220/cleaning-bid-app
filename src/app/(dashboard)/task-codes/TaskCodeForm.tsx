'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createTaskCode, updateTaskCode, type ActionState } from './actions'
import type { TaskCode } from '@/types/task-code'
import SearchableSelect from '@/components/ui/SearchableSelect'
import type { SelectOption } from '@/components/ui/SearchableSelect'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

export default function TaskCodeForm({
  taskCode,
  taskTypes,
  positions,
}: {
  taskCode?: TaskCode
  taskTypes: { id: string; type_name: string }[]
  positions: { id: string; position_name: string }[]
}) {
  const action = taskCode
    ? updateTaskCode.bind(null, taskCode.id)
    : createTaskCode

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null)

  const taskTypeOptions: SelectOption[] = taskTypes.map((t) => ({ value: t.id, label: t.type_name }))
  const positionOptions: SelectOption[] = positions.map((p) => ({ value: p.id, label: p.position_name }))

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Identity */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Task Code Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Task Code <span className="text-red-500">*</span>
            </label>
            <input
              name="task_code"
              type="text"
              required
              maxLength={35}
              defaultValue={taskCode?.task_code ?? ''}
              placeholder="e.g. VACFL"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">Max 35 characters — auto-uppercased</p>
          </div>
          <div>
            <label className={labelClass}>
              Task Name <span className="text-red-500">*</span>
            </label>
            <input
              name="task_name"
              type="text"
              required
              maxLength={35}
              defaultValue={taskCode?.task_name ?? ''}
              placeholder="e.g. Vacuum Floors"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">Max 35 characters</p>
          </div>
        </div>
      </section>

      {/* Classification */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Classification</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Task Type</label>
            <SearchableSelect
              name="task_type_id"
              options={taskTypeOptions}
              defaultValue={taskCode?.task_type_id}
              placeholder="Search task types..."
            />
          </div>
          <div>
            <label className={labelClass}>Default Position</label>
            <SearchableSelect
              name="position_id"
              options={positionOptions}
              defaultValue={taskCode?.position_id}
              placeholder="Search positions..."
            />
          </div>
        </div>
      </section>

      {/* Production */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Production</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Unit of Measure <span className="text-red-500">*</span>
            </label>
            <select
              name="unit_of_measure"
              required
              defaultValue={taskCode?.unit_of_measure ?? ''}
              className={inputClass}
            >
              <option value="" disabled>Select unit...</option>
              <option value="sqft_per_hour">Sq ft per hour</option>
              <option value="minutes_per_unit">Minutes per unit</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Production Rate</label>
            <input
              name="production_rate"
              type="number"
              min="0"
              step="any"
              defaultValue={taskCode?.production_rate ?? ''}
              placeholder="e.g. 1500"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">Sq ft/hr or min/unit depending on UOM</p>
          </div>
        </div>
      </section>

      {/* Descriptions */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Descriptions</h2>
        <div>
          <label className={labelClass}>Description (English)</label>
          <textarea
            name="description"
            rows={3}
            maxLength={255}
            defaultValue={taskCode?.description ?? ''}
            placeholder="Describe the task in English..."
            className={inputClass}
          />
          <p className="text-xs text-gray-400">Max 255 characters</p>
        </div>
        <div>
          <label className={labelClass}>Alternate Language (Spanish)</label>
          <textarea
            name="description_alt"
            rows={3}
            maxLength={255}
            defaultValue={taskCode?.description_alt ?? ''}
            placeholder="Descripción en español..."
            className={inputClass}
          />
          <p className="text-xs text-gray-400">Max 255 characters</p>
        </div>
      </section>

      <div className="flex items-center gap-3 pb-6">
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {isPending ? 'Saving...' : taskCode ? 'Save Changes' : 'Create Task Code'}
        </button>
        <Link href="/task-codes" className="text-sm font-medium text-gray-600 hover:text-gray-800">
          Cancel
        </Link>
      </div>
    </form>
  )
}
