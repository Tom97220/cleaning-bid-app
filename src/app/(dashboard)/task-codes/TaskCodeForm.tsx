'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createTaskCode, updateTaskCode, type ActionState } from './actions'
import type { TaskCode } from '@/types/task-code'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

export default function TaskCodeForm({ taskCode }: { taskCode?: TaskCode }) {
  const action = taskCode
    ? updateTaskCode.bind(null, taskCode.id)
    : createTaskCode

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null)

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

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

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit of Measure</h2>
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
            <option value="" disabled>Select a unit of measure...</option>
            <option value="sqft_per_hour">Sq ft per hour</option>
            <option value="minutes_per_unit">Minutes per unit</option>
          </select>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</h2>
        <textarea
          name="description"
          rows={4}
          maxLength={255}
          defaultValue={taskCode?.description ?? ''}
          placeholder="Optional description of the task..."
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
          {isPending ? 'Saving...' : taskCode ? 'Save Changes' : 'Create Task Code'}
        </button>
        <Link href="/task-codes" className="text-sm font-medium text-gray-600 hover:text-gray-800">
          Cancel
        </Link>
      </div>
    </form>
  )
}
