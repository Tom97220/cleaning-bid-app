'use client'

import { useActionState, useState, useRef } from 'react'
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

  const [uom,            setUom]           = useState(taskCode?.unit_of_measure ?? '')
  const [descriptionAlt, setDescriptionAlt] = useState(taskCode?.description_alt ?? '')
  const [translating,    setTranslating]    = useState(false)
  const [translateError, setTranslateError] = useState<string | null>(null)

  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  async function handleTranslate() {
    const text = descriptionRef.current?.value.trim() ?? ''
    if (!text) return
    setTranslating(true)
    setTranslateError(null)
    try {
      const res = await fetch('/api/translate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ texts: [text] }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { translations, error: apiErr } = await res.json() as {
        translations?: { en: string; es: string }[]
        error?: string
      }
      if (apiErr) throw new Error(apiErr)
      const es = translations?.[0]?.es
      if (es) setDescriptionAlt(es)
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setTranslating(false)
    }
  }

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
        <div className={uom === 'both' ? 'space-y-4' : 'grid grid-cols-2 gap-4'}>
          <div className={uom === 'both' ? 'w-1/2' : ''}>
            <label className={labelClass}>
              Unit of Measure <span className="text-red-500">*</span>
            </label>
            <select
              name="unit_of_measure"
              required
              value={uom}
              onChange={(e) => setUom(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>Select unit...</option>
              <option value="sqft_per_hour">Sq ft per hour</option>
              <option value="minutes_per_unit">Minutes per unit</option>
              <option value="both">Both (sq ft + each)</option>
            </select>
          </div>

          {uom === 'both' ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>
                  Sq Ft / Hour rate <span className="text-red-500">*</span>
                </label>
                <input
                  name="production_rate"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={taskCode?.production_rate ?? ''}
                  placeholder="e.g. 1500"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Minutes / Each rate <span className="text-red-500">*</span>
                </label>
                <input
                  name="rate_each"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={taskCode?.rate_each ?? ''}
                  placeholder="e.g. 5"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Default Basis <span className="text-red-500">*</span>
                </label>
                <select
                  name="default_basis"
                  defaultValue={taskCode?.default_basis ?? ''}
                  className={inputClass}
                >
                  <option value="" disabled>Select basis...</option>
                  <option value="sqft_per_hour">Sq Ft per Hour</option>
                  <option value="minutes_per_unit">Minutes per Each</option>
                </select>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </section>

      {/* Descriptions */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Descriptions</h2>
        <div>
          <label className={labelClass}>Description (English)</label>
          <textarea
            ref={descriptionRef}
            name="description"
            rows={3}
            defaultValue={taskCode?.description ?? ''}
            placeholder="Describe the task in English..."
            className={inputClass}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Alternate Language (Spanish)</label>
            <button
              type="button"
              onClick={handleTranslate}
              disabled={translating}
              className="flex items-center gap-1.5 border border-gray-300 hover:border-gray-400 text-gray-700 bg-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {translating ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Translating…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  Translate
                </>
              )}
            </button>
          </div>
          <textarea
            name="description_alt"
            rows={3}
            value={descriptionAlt}
            onChange={(e) => setDescriptionAlt(e.target.value)}
            placeholder="Descripción en español..."
            className={inputClass}
          />
          {translateError && (
            <p className="text-xs text-red-600 mt-1">Translation error: {translateError}</p>
          )}
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
