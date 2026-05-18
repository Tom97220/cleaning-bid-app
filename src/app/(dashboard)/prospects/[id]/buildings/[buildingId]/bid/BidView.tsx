'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { saveBidAll } from './actions'
import type { BidSummary, BidLaborLineRow, BidLaborCost, BidOtherCost, MarginType, CostType } from '@/types/bid'
import { calcBidTotals, calcCostLine, calcPositionCost } from '@/types/bid'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LaborRowLocal {
  key: string
  id: string | null
  position_id: string
  annual_hours: string
  rate: string
  deleted: boolean
}

interface CostRowLocal {
  key: string
  id: string | null
  description: string
  type: CostType
  factor: string
  deleted: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const $ = (n: number | null) =>
  n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

function numOrNull(s: string): number | null {
  if (!s || !s.trim()) return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

let _keyCount = 0
const newKey = () => `_${++_keyCount}`

function blankLaborRow(): LaborRowLocal {
  return { key: newKey(), id: null, position_id: '', annual_hours: '', rate: '', deleted: false }
}

function blankCostRow(): CostRowLocal {
  return { key: newKey(), id: null, description: '', type: 'percent_markup', factor: '', deleted: false }
}

function isBlankLabor(r: LaborRowLocal)  { return r.id === null && !r.position_id && !r.annual_hours && !r.rate }
function isBlankCost(r: CostRowLocal)    { return r.id === null && !r.description && !r.factor }

function ensureLaborBlank(rows: LaborRowLocal[]): LaborRowLocal[] {
  const vis = rows.filter(r => !r.deleted)
  if (!vis.length || !isBlankLabor(vis[vis.length - 1])) return [...rows, blankLaborRow()]
  return rows
}

function ensureCostBlank(rows: CostRowLocal[]): CostRowLocal[] {
  const vis = rows.filter(r => !r.deleted)
  if (!vis.length || !isBlankCost(vis[vis.length - 1])) return [...rows, blankCostRow()]
  return rows
}

function toLaborRows(lines: BidLaborLineRow[]): LaborRowLocal[] {
  return ensureLaborBlank(lines.map(l => ({
    key: l.id,
    id:  l.id,
    position_id:  l.position_id ?? '',
    annual_hours: l.annual_hours != null ? String(l.annual_hours) : '',
    rate:         l.rate != null ? String(l.rate) : '',
    deleted: false,
  })))
}

function toCostRows(costs: (BidLaborCost | BidOtherCost)[]): CostRowLocal[] {
  return ensureCostBlank(costs.map(c => ({
    key: c.id,
    id:  c.id,
    description: c.description ?? '',
    type:   c.type as CostType,
    factor: c.factor != null ? String(c.factor) : '',
    deleted: false,
  })))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const cellInput  = 'w-full border border-gray-200 rounded px-1.5 py-1 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white'
const cellSelect = 'w-full border border-gray-200 rounded px-1.5 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white'
const subInput   = 'w-20 border border-gray-200 rounded px-1.5 py-0.5 text-xs tabular-nums text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white'

function RecapRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function CostTable({
  title,
  rows,
  onUpdate,
  onDelete,
  totalLabor,
  totalHours,
  sectionTotal,
  isAdmin,
  nameOptions,
}: {
  title: string
  rows: CostRowLocal[]
  onUpdate: (key: string, field: keyof Omit<CostRowLocal, 'key' | 'id' | 'deleted'>, val: string) => void
  onDelete: (key: string) => void
  totalLabor: number
  totalHours: number
  sectionTotal: number
  isAdmin: boolean
  nameOptions: string[]
}) {
  const visible = rows.filter(r => !r.deleted)
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Description', 'Type', 'Factor', 'Annual Cost', ''].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map(row => {
              const cost = calcCostLine(row.type, numOrNull(row.factor), totalLabor, totalHours)
              const isNew = row.id === null
              const factorSuffix = row.type === 'percent_markup' ? '%' : row.type === 'per_hour' ? '$/hr' : '$/yr'
              return (
                <tr key={row.key} className={isNew ? 'bg-gray-50/40' : 'hover:bg-gray-50'}>
                  <td className="px-2 py-1.5 min-w-[180px]">
                    <select
                      value={row.description}
                      onChange={e => onUpdate(row.key, 'description', e.target.value)}
                      className={cellSelect}
                    >
                      <option value="">— Select —</option>
                      {nameOptions.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                      {row.description && !nameOptions.includes(row.description) && (
                        <option value={row.description}>{row.description}</option>
                      )}
                    </select>
                  </td>
                  <td className="px-2 py-1.5 w-36">
                    <select
                      value={row.type}
                      onChange={e => onUpdate(row.key, 'type', e.target.value)}
                      className={cellSelect}
                    >
                      <option value="percent_markup">% of Labor</option>
                      <option value="per_hour">$/hr</option>
                      <option value="per_year">$/year</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5 w-36">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.factor}
                        onChange={e => onUpdate(row.key, 'factor', e.target.value)}
                        placeholder="0"
                        className={cellInput}
                      />
                      <span className="text-xs text-gray-400 shrink-0">{factorSuffix}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm tabular-nums font-medium text-gray-900 w-32">
                    {cost > 0 ? $(cost) : '—'}
                  </td>
                  <td className="px-2 py-1.5 w-10 text-center">
                    {isAdmin && !isNew && (
                      <button
                        onClick={() => confirm(`Delete "${row.description || 'this row'}"?`) && onDelete(row.key)}
                        className="text-xs text-red-400 hover:text-red-600 leading-none"
                        title="Delete row"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {sectionTotal > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Total</td>
                <td className="px-3 py-2 text-sm tabular-nums font-semibold text-gray-900">{$(sectionTotal)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BidView({
  laborLines,
  laborCosts,
  otherCosts,
  summary,
  buildingId,
  prospectId,
  sqft,
  isAdmin,
  positions,
  laborCostTypeNames,
  otherCostTypeNames,
}: {
  laborLines: BidLaborLineRow[]
  laborCosts: BidLaborCost[]
  otherCosts: BidOtherCost[]
  summary:    BidSummary | null
  buildingId: string
  prospectId: string
  sqft:               number | null
  isAdmin:            boolean
  positions:          { id: string; position_name: string }[]
  laborCostTypeNames: string[]
  otherCostTypeNames: string[]
}) {
  const router = useRouter()

  // ── Pricing settings ──
  const [marginType,  setMarginType]  = useState<MarginType>(summary?.margin_type ?? 'percent')
  const [marginValue, setMarginValue] = useState(summary?.margin_value ?? 0)
  const [vacationPct, setVacationPct] = useState(summary?.vacation_pct ?? 4)
  const [vacationHrsOverride, setVacationHrsOverride] = useState(
    summary?.vacation_hours_override != null ? String(summary.vacation_hours_override) : '',
  )
  const [sickHrsOverride, setSickHrsOverride] = useState(
    summary?.sick_hours_override != null ? String(summary.sick_hours_override) : '',
  )
  const [vacationRate, setVacationRate] = useState(
    summary?.vacation_rate != null ? String(summary.vacation_rate) : '',
  )
  const [sickRate, setSickRate] = useState(
    summary?.sick_rate != null ? String(summary.sick_rate) : '',
  )

  // ── Row state ──
  const [laborRows,     setLaborRows]     = useState<LaborRowLocal[]>(() => toLaborRows(laborLines))
  const [laborCostRows, setLaborCostRows] = useState<CostRowLocal[]>(() => toCostRows(laborCosts))
  const [otherCostRows, setOtherCostRows] = useState<CostRowLocal[]>(() => toCostRows(otherCosts))

  // Re-initialize state when props change after router.refresh()
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    setLaborRows(toLaborRows(laborLines))
    setLaborCostRows(toCostRows(laborCosts))
    setOtherCostRows(toCostRows(otherCosts))
    setMarginType(summary?.margin_type ?? 'percent')
    setMarginValue(summary?.margin_value ?? 0)
    setVacationPct(summary?.vacation_pct ?? 4)
    setVacationHrsOverride(summary?.vacation_hours_override != null ? String(summary.vacation_hours_override) : '')
    setSickHrsOverride(summary?.sick_hours_override != null ? String(summary.sick_hours_override) : '')
    setVacationRate(summary?.vacation_rate != null ? String(summary.vacation_rate) : '')
    setSickRate(summary?.sick_rate != null ? String(summary.sick_rate) : '')
  }, [laborLines, laborCosts, otherCosts, summary])

  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Live calculation inputs ──
  const calcLaborLines = laborRows
    .filter(r => !r.deleted && (r.position_id || r.annual_hours || r.rate))
    .map(r => ({
      id: r.id ?? r.key, building_id: buildingId,
      position_id: r.position_id || null,
      annual_hours: numOrNull(r.annual_hours),
      rate: numOrNull(r.rate),
      annual_cost: null, sort_order: null, created_at: '', updated_at: '',
    }))

  const calcLaborCosts = laborCostRows
    .filter(r => !r.deleted && (r.description || r.factor))
    .map(r => ({
      id: r.id ?? r.key, building_id: buildingId,
      description: r.description || null,
      type: r.type, factor: numOrNull(r.factor),
      annual_cost: null, sort_order: null, created_at: '', updated_at: '',
    }))

  const calcOtherCosts = otherCostRows
    .filter(r => !r.deleted && (r.description || r.factor))
    .map(r => ({
      id: r.id ?? r.key, building_id: buildingId,
      description: r.description || null,
      type: r.type, factor: numOrNull(r.factor),
      annual_cost: null, sort_order: null, created_at: '', updated_at: '',
    }))

  const totals = calcBidTotals(
    calcLaborLines,
    calcLaborCosts,
    calcOtherCosts,
    marginType,
    marginValue,
    sqft,
    vacationPct,
    numOrNull(vacationHrsOverride),
    numOrNull(sickHrsOverride),
    numOrNull(vacationRate),
    numOrNull(sickRate),
  )

  // ── Row update helpers ──
  function updateLaborField(key: string, field: keyof Omit<LaborRowLocal, 'key' | 'id' | 'deleted'>, val: string) {
    setLaborRows(prev => ensureLaborBlank(prev.map(r => r.key === key ? { ...r, [field]: val } : r)))
  }

  function deleteLabor(key: string) {
    setLaborRows(prev => ensureLaborBlank(prev.map(r => r.key === key ? { ...r, deleted: true } : r)))
  }

  function updateCostField(
    setter: React.Dispatch<React.SetStateAction<CostRowLocal[]>>,
    key: string,
    field: keyof Omit<CostRowLocal, 'key' | 'id' | 'deleted'>,
    val: string,
  ) {
    setter(prev => ensureCostBlank(prev.map(r => r.key === key ? { ...r, [field]: val } : r)))
  }

  function deleteCost(setter: React.Dispatch<React.SetStateAction<CostRowLocal[]>>, key: string) {
    setter(prev => ensureCostBlank(prev.map(r => r.key === key ? { ...r, deleted: true } : r)))
  }

  // ── Save all ──
  async function saveAll() {
    setSaving(true)
    setSaveError(null)

    const result = await saveBidAll(buildingId, prospectId, {
      summary: {
        margin_type: marginType,
        margin_value: marginValue,
        vacation_pct: vacationPct,
        vacation_hours_override: numOrNull(vacationHrsOverride),
        sick_hours_override: numOrNull(sickHrsOverride),
        vacation_rate: numOrNull(vacationRate),
        sick_rate: numOrNull(sickRate),
      },
      laborLines: {
        upserts: laborRows
          .filter(r => !r.deleted && (r.position_id || r.annual_hours || r.rate))
          .map(r => ({ id: r.id, position_id: r.position_id || null, annual_hours: numOrNull(r.annual_hours), rate: numOrNull(r.rate) })),
        deletes: laborRows.filter(r => r.deleted && r.id !== null).map(r => r.id!),
      },
      laborCosts: {
        upserts: laborCostRows
          .filter(r => !r.deleted && (r.description || r.factor))
          .map(r => ({ id: r.id, description: r.description || null, type: r.type, factor: numOrNull(r.factor) })),
        deletes: laborCostRows.filter(r => r.deleted && r.id !== null).map(r => r.id!),
      },
      otherCosts: {
        upserts: otherCostRows
          .filter(r => !r.deleted && (r.description || r.factor))
          .map(r => ({ id: r.id, description: r.description || null, type: r.type, factor: numOrNull(r.factor) })),
        deletes: otherCostRows.filter(r => r.deleted && r.id !== null).map(r => r.id!),
      },
    })

    if (result?.error) {
      setSaveError(result.error)
      setSaving(false)
    } else {
      router.refresh()
      setSaving(false)
    }
  }

  const hasPositionData = laborRows.some(r => !r.deleted && (r.position_id || r.annual_hours || r.rate))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 flex gap-6 items-start min-h-0">

      {/* ── Main Sections ── */}
      <div className="flex-1 min-w-0 space-y-8">

        {/* Section 1 — Labor by Position */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Section 1 — Labor by Position</h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Position', 'Annual Hrs', 'Rate ($/hr)', 'Annual Cost', ''].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {laborRows.filter(r => !r.deleted).map(row => {
                  const cost = calcPositionCost(numOrNull(row.annual_hours), numOrNull(row.rate))
                  const isNew = row.id === null
                  return (
                    <tr key={row.key} className={isNew ? 'bg-gray-50/40' : 'hover:bg-gray-50'}>
                      <td className="px-2 py-1.5 min-w-[180px]">
                        <select
                          value={row.position_id}
                          onChange={e => updateLaborField(row.key, 'position_id', e.target.value)}
                          className={cellSelect}
                        >
                          <option value="">— Select position —</option>
                          {positions.map(p => (
                            <option key={p.id} value={p.id}>{p.position_name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 w-28">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.annual_hours}
                          onChange={e => updateLaborField(row.key, 'annual_hours', e.target.value)}
                          placeholder="0"
                          className={cellInput}
                        />
                      </td>
                      <td className="px-2 py-1.5 w-28">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.rate}
                          onChange={e => updateLaborField(row.key, 'rate', e.target.value)}
                          placeholder="0.00"
                          className={cellInput}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm tabular-nums font-medium text-gray-900 w-32">
                        {cost > 0 ? $(cost) : '—'}
                      </td>
                      <td className="px-2 py-1.5 w-10 text-center">
                        {isAdmin && !isNew && (
                          <button
                            onClick={() => confirm('Delete this labor line?') && deleteLabor(row.key)}
                            className="text-xs text-red-400 hover:text-red-600 leading-none"
                            title="Delete row"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}

                {hasPositionData && (
                  <>
                    {/* Vacation sub-row */}
                    <tr className="bg-blue-50/40 border-t border-gray-100">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400 font-medium">↳ Vacation</span>
                          <input
                            type="number" min="0" step="any"
                            value={vacationPct}
                            onChange={e => setVacationPct(parseFloat(e.target.value) || 0)}
                            className={subInput}
                            title="Vacation %"
                          />
                          <span className="text-xs text-gray-400">%</span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number" min="0" step="any"
                          value={vacationHrsOverride}
                          onChange={e => setVacationHrsOverride(e.target.value)}
                          placeholder={totals.vacationHoursDefault.toFixed(1)}
                          className={subInput}
                          title="Override vacation hours"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number" min="0" step="any"
                          value={vacationRate}
                          onChange={e => setVacationRate(e.target.value)}
                          placeholder="$/hr"
                          className={subInput}
                          title="Vacation rate ($/hr)"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm tabular-nums text-gray-600">
                        {$(totals.vacationCost || null)}
                      </td>
                      <td />
                    </tr>

                    {/* Sick sub-row */}
                    <tr className="bg-blue-50/40 border-t border-gray-100">
                      <td className="px-3 py-2">
                        <span className="text-xs text-gray-400 font-medium">↳ Sick</span>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number" min="0" step="any"
                          value={sickHrsOverride}
                          onChange={e => setSickHrsOverride(e.target.value)}
                          placeholder={totals.sickHoursDefault.toFixed(1)}
                          className={subInput}
                          title="Override sick hours"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number" min="0" step="any"
                          value={sickRate}
                          onChange={e => setSickRate(e.target.value)}
                          placeholder="$/hr"
                          className={subInput}
                          title="Sick rate ($/hr)"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm tabular-nums text-gray-600">
                        {$(totals.sickCost || null)}
                      </td>
                      <td />
                    </tr>
                  </>
                )}
              </tbody>
              {hasPositionData && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-700 uppercase">Total Labor</td>
                    <td className="px-3 py-2 text-sm tabular-nums font-semibold text-gray-900">
                      {totals.totalPositionHours.toLocaleString()}
                    </td>
                    <td />
                    <td className="px-3 py-2 text-sm tabular-nums font-semibold text-gray-900">
                      {$(totals.totalLabor)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Section 2 — Labor Related Costs */}
        <CostTable
          title="Section 2 — Labor Related Costs"
          rows={laborCostRows}
          onUpdate={(key, field, val) => updateCostField(setLaborCostRows, key, field, val)}
          onDelete={(key) => deleteCost(setLaborCostRows, key)}
          totalLabor={totals.totalLabor}
          totalHours={totals.totalHours}
          sectionTotal={totals.totalLaborRelated}
          isAdmin={isAdmin}
          nameOptions={laborCostTypeNames}
        />

        {/* Section 3 — Other Direct Costs */}
        <CostTable
          title="Section 3 — Other Direct Costs"
          rows={otherCostRows}
          onUpdate={(key, field, val) => updateCostField(setOtherCostRows, key, field, val)}
          onDelete={(key) => deleteCost(setOtherCostRows, key)}
          totalLabor={totals.totalLabor}
          totalHours={totals.totalHours}
          sectionTotal={totals.totalOtherDirect}
          isAdmin={isAdmin}
          nameOptions={otherCostTypeNames}
        />

        {/* Save */}
        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {saveError}
          </div>
        )}
        <div className="flex justify-end pt-2 pb-8">
          <button
            onClick={saveAll}
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-8 py-2.5 rounded-lg transition-colors disabled:opacity-60 shadow-sm"
          >
            {saving ? 'Saving…' : 'Save Bid'}
          </button>
        </div>
      </div>

      {/* ── Pricing Recap Sidebar ── */}
      <div className="w-72 shrink-0 sticky top-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pricing Recap</h3>

          {/* Cost breakdown */}
          <div className="space-y-1.5">
            <RecapRow label="Total Labor"         value={$(totals.totalLabor)} />
            <RecapRow label="Labor Related Costs" value={$(totals.totalLaborRelated)} />
            <RecapRow label="Other Direct Costs"  value={$(totals.totalOtherDirect)} />
            <div className="border-t border-gray-100 pt-1.5">
              <RecapRow label="Total Cost" value={$(totals.totalCost)} bold />
            </div>
          </div>

          {/* Margin toggle */}
          <div className="border-t border-gray-100 pt-3 space-y-3">
            <div className="flex gap-1.5">
              <button
                onClick={() => setMarginType('percent')}
                className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors border ${
                  marginType === 'percent'
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
                }`}
              >
                Gross Margin %
              </button>
              <button
                onClick={() => setMarginType('fixed_fee')}
                className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors border ${
                  marginType === 'fixed_fee'
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
                }`}
              >
                Fixed Fee $
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">
                {marginType === 'percent' ? 'Gross Margin' : 'Fixed Fee'}
              </label>
              <div className="flex items-center gap-1">
                {marginType === 'fixed_fee' && <span className="text-sm text-gray-400">$</span>}
                <input
                  type="number"
                  min="0"
                  step={marginType === 'percent' ? '0.1' : 'any'}
                  max={marginType === 'percent' ? '99.99' : undefined}
                  value={marginValue}
                  onChange={e => setMarginValue(parseFloat(e.target.value) || 0)}
                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {marginType === 'percent' && <span className="text-sm text-gray-400">%</span>}
              </div>
            </div>
          </div>

          {/* Selling price */}
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            <RecapRow label="Price / Year"        value={$(totals.sellingPrice)} bold />
            <RecapRow label="Price / Month"       value={$(totals.pricePerMonth)} bold />
            {totals.sqftAnnual != null && (
              <RecapRow label="$/Sq Ft (Annual)"  value={`$${totals.sqftAnnual.toFixed(4)}`} />
            )}
            {totals.sqftMonthly != null && (
              <RecapRow label="$/Sq Ft (Monthly)" value={`$${totals.sqftMonthly.toFixed(4)}`} />
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-3">
          {marginType === 'percent'
            ? `Selling Price = Total Cost ÷ (1 − ${marginValue}%)`
            : `Selling Price = Total Cost + $${marginValue.toLocaleString()}`}
        </p>
      </div>
    </div>
  )
}
