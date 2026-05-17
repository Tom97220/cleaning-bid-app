'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  updateBidSummary,
  deleteLaborLine,
  deleteLaborCost,
  deleteOtherCost,
} from './actions'
import type { BidSummary, BidLaborLineRow, BidLaborCost, BidOtherCost } from '@/types/bid'
import { calcBidTotals, calcCostLine, calcLaborLineCost, COST_TYPE_LABELS } from '@/types/bid'
import type { CostType } from '@/types/bid'

const $ = (n: number | null) =>
  n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

const pct = (n: number) => `${n}%`

function SectionHeader({ title, addHref }: { title: string; addHref: string }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <Link
        href={addHref}
        className="text-xs bg-brand-600 hover:bg-brand-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
      >
        + Add
      </Link>
    </div>
  )
}

function RecapRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

export default function BidView({
  laborLines,
  laborCosts,
  otherCosts,
  summary,
  buildingId,
  prospectId,
  sqft,
  isAdmin,
}: {
  laborLines: BidLaborLineRow[]
  laborCosts: BidLaborCost[]
  otherCosts: BidOtherCost[]
  summary:    BidSummary | null
  buildingId: string
  prospectId: string
  sqft:       number | null
  isAdmin:    boolean
}) {
  const router = useRouter()
  const [overheadPct, setOverheadPct] = useState(summary?.overhead_pct ?? 0)
  const [profitPct,   setProfitPct]   = useState(summary?.profit_markup_pct ?? 0)
  const [saving,      setSaving]      = useState(false)
  const [isPending,   startTransition] = useTransition()

  const summaryChanged =
    overheadPct !== (summary?.overhead_pct ?? 0) ||
    profitPct   !== (summary?.profit_markup_pct ?? 0)

  const totals = calcBidTotals(laborLines, laborCosts, otherCosts, overheadPct, profitPct, sqft)

  async function saveSummary() {
    setSaving(true)
    await updateBidSummary(buildingId, prospectId, overheadPct, profitPct)
    setSaving(false)
    router.refresh()
  }

  function handleDelete(fn: () => Promise<unknown>) {
    startTransition(async () => { await fn(); router.refresh() })
  }

  const base = `/prospects/${prospectId}/buildings/${buildingId}/bid`

  return (
    <div className="p-6 flex gap-6 items-start min-h-0">
      {/* ── Main Sections ── */}
      <div className="flex-1 min-w-0 space-y-8">

        {/* Section 1: Labor by Position */}
        <div className="space-y-3">
          <SectionHeader title="Section 1 — Labor by Position" addHref={`${base}/labor-lines/new`} />
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Position', 'Annual Hrs', 'Vacation %', 'Sick Hrs', 'Rate', 'Annual Cost', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {laborLines.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No labor lines yet — click "+ Add" to get started.</td></tr>
                ) : laborLines.map((l) => {
                  const cost = calcLaborLineCost(l.annual_hours, l.vacation_pct, l.sick_hours, l.rate)
                  const sick = l.sick_hours ?? (l.annual_hours ? l.annual_hours / 30 : null)
                  return (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{l.positions?.position_name ?? '—'}</td>
                      <td className="px-3 py-3 text-sm tabular-nums text-gray-700">{l.annual_hours?.toLocaleString() ?? '—'}</td>
                      <td className="px-3 py-3 text-sm tabular-nums text-gray-700">{l.vacation_pct}%</td>
                      <td className="px-3 py-3 text-sm tabular-nums text-gray-700">{sick != null ? sick.toFixed(1) : '—'}</td>
                      <td className="px-3 py-3 text-sm tabular-nums text-gray-700">{l.rate != null ? `$${l.rate.toFixed(2)}` : '—'}</td>
                      <td className="px-3 py-3 text-sm tabular-nums font-medium text-gray-900">{$(cost || null)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Link href={`${base}/labor-lines/${l.id}/edit`} className="text-sm text-brand-600 hover:text-brand-800 font-medium">Edit</Link>
                          {isAdmin && (
                            <button
                              onClick={() => confirm(`Delete this labor line?`) && handleDelete(() => deleteLaborLine(l.id, buildingId, prospectId))}
                              disabled={isPending}
                              className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                            >Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {laborLines.length > 0 && (
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Totals</td>
                    <td className="px-3 py-2 text-sm tabular-nums font-semibold text-gray-900">{totals.totalHours.toLocaleString()}</td>
                    <td colSpan={3} />
                    <td className="px-3 py-2 text-sm tabular-nums font-semibold text-gray-900">{$(totals.totalLabor)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Section 2: Labor Related Costs */}
        <div className="space-y-3">
          <SectionHeader title="Section 2 — Labor Related Costs" addHref={`${base}/labor-costs/new`} />
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Description', 'Type', 'Factor', 'Annual Cost', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {laborCosts.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No labor related costs yet.</td></tr>
                ) : laborCosts.map((c) => {
                  const cost = calcCostLine(c.type as CostType, c.factor, totals.totalLabor, totals.totalHours)
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-sm text-gray-700">{c.description ?? '—'}</td>
                      <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">{COST_TYPE_LABELS[c.type]}</td>
                      <td className="px-3 py-3 text-sm tabular-nums text-gray-700">
                        {c.factor != null ? (c.type === 'percent_markup' ? `${c.factor}%` : c.factor.toLocaleString()) : '—'}
                      </td>
                      <td className="px-3 py-3 text-sm tabular-nums font-medium text-gray-900">{$(cost || null)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Link href={`${base}/labor-costs/${c.id}/edit`} className="text-sm text-brand-600 hover:text-brand-800 font-medium">Edit</Link>
                          {isAdmin && (
                            <button
                              onClick={() => confirm(`Delete "${c.description}"?`) && handleDelete(() => deleteLaborCost(c.id, buildingId, prospectId))}
                              disabled={isPending}
                              className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                            >Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {laborCosts.length > 0 && (
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase" colSpan={3}>Total</td>
                    <td className="px-3 py-2 text-sm tabular-nums font-semibold text-gray-900">{$(totals.totalLaborRelated)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Section 3: Other Direct Costs */}
        <div className="space-y-3">
          <SectionHeader title="Section 3 — Other Direct Costs" addHref={`${base}/other-costs/new`} />
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Description', 'Type', 'Factor', 'Annual Cost', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {otherCosts.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No other direct costs yet.</td></tr>
                ) : otherCosts.map((c) => {
                  const cost = calcCostLine(c.type as CostType, c.factor, totals.totalLabor, totals.totalHours)
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-sm text-gray-700">{c.description ?? '—'}</td>
                      <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">{COST_TYPE_LABELS[c.type]}</td>
                      <td className="px-3 py-3 text-sm tabular-nums text-gray-700">
                        {c.factor != null ? (c.type === 'percent_markup' ? `${c.factor}%` : c.factor.toLocaleString()) : '—'}
                      </td>
                      <td className="px-3 py-3 text-sm tabular-nums font-medium text-gray-900">{$(cost || null)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Link href={`${base}/other-costs/${c.id}/edit`} className="text-sm text-brand-600 hover:text-brand-800 font-medium">Edit</Link>
                          {isAdmin && (
                            <button
                              onClick={() => confirm(`Delete "${c.description}"?`) && handleDelete(() => deleteOtherCost(c.id, buildingId, prospectId))}
                              disabled={isPending}
                              className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                            >Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {otherCosts.length > 0 && (
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase" colSpan={3}>Total</td>
                    <td className="px-3 py-2 text-sm tabular-nums font-semibold text-gray-900">{$(totals.totalOtherDirect)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* ── Pricing Recap Sidebar ── */}
      <div className="w-72 shrink-0 sticky top-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pricing Recap</h3>

          <div className="space-y-1.5">
            <RecapRow label="Total Labor"           value={$(totals.totalLabor)} />
            <RecapRow label="Labor Related Costs"   value={$(totals.totalLaborRelated)} />
            <RecapRow label="Other Direct Costs"    value={$(totals.totalOtherDirect)} />
            <div className="border-t border-gray-100 pt-1.5">
              <RecapRow label="Total Operating" value={$(totals.totalOperating)} bold />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Overhead %</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={overheadPct}
                  onChange={(e) => setOverheadPct(parseFloat(e.target.value) || 0)}
                  className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-400">%</span>
              </div>
            </div>
            <RecapRow label="Overhead" value={$(totals.overhead)} />
            <div className="border-t border-gray-100 pt-1.5">
              <RecapRow label="Grand Total" value={$(totals.grandTotal)} bold />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Profit %</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={profitPct}
                  onChange={(e) => setProfitPct(parseFloat(e.target.value) || 0)}
                  className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-400">%</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            <RecapRow label="Price / Year"    value={$(totals.sellingPrice)} bold />
            <RecapRow label="Price / Month"   value={$(totals.pricePerMonth)} bold />
            {totals.sqftAnnual != null && (
              <RecapRow label="$/Sq Ft (Annual)"  value={`$${totals.sqftAnnual.toFixed(4)}`} />
            )}
            {totals.sqftMonthly != null && (
              <RecapRow label="$/Sq Ft (Monthly)" value={`$${totals.sqftMonthly.toFixed(4)}`} />
            )}
          </div>

          {summaryChanged && (
            <button
              onClick={saveSummary}
              disabled={saving}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          Overhead and Profit apply to the Grand Total and Selling Price.
        </p>
      </div>
    </div>
  )
}
