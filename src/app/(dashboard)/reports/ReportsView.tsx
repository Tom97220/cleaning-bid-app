'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  calcBidTotals,
  calcCostLine,
  calcPositionCost,
  type BidLaborLine,
  type BidLaborCost,
  type BidOtherCost,
  type BidSummary,
} from '@/types/bid'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prospect { id: string; company_name: string }
interface Building { id: string; building_name: string; square_feet: number | null }

interface TaskLineItem {
  id: string
  task_name: string | null
  frequency: number | null
  yearly_hrs: number | null
  weekly_hrs: number | null
  daily_hrs: number | null
  monthly_hrs: number | null
  print: boolean
  created_at: string
  task_codes: { task_code: string; task_name: string } | null
  positions: { position_name: string } | null
}

interface Area {
  id: string
  area_name: string
  print_order: number | null
  frequency: number | null
  created_at: string
  task_line_items: TaskLineItem[]
}

interface ReportData {
  prospect: Prospect
  building: Building
  areas: Area[]
  bidSummary: BidSummary | null
  bidLaborLines: (BidLaborLine & { positions: { position_name: string } | null })[]
  bidLaborCosts: BidLaborCost[]
  bidOtherCosts: BidOtherCost[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REPORT_OPTIONS = [
  { key: 'scope_no_codes',   label: 'Scope of Work (without task codes)', category: 'Workload', isScope: true },
  { key: 'scope_with_codes', label: 'Scope of Work (with task codes)',    category: 'Workload', isScope: true },
  { key: 'wl_summary',       label: 'Work Load Development Summary',      category: 'Workload', isScope: false },
  { key: 'wl_detail',        label: 'Work Load Development Detail',       category: 'Workload', isScope: false },
  { key: 'wl_by_position',   label: 'Work Load by Position',              category: 'Workload', isScope: false },
  { key: 'investment_recap', label: 'Investment Recap / Bidding Report',  category: 'Bidding',  isScope: false },
]

const WORKLOAD_REPORTS = REPORT_OPTIONS.filter(r => r.category === 'Workload')
const BIDDING_REPORTS  = REPORT_OPTIONS.filter(r => r.category === 'Bidding')

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt$ = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

const fmtHrs = (n: number | null | undefined) =>
  n == null ? '—' : n.toFixed(2)

const fmtFreq = (freq: number | null): string => {
  if (!freq) return '—'
  const map: Record<number, string> = {
    365: 'Daily (7 days)',
    260: 'Daily (Mon–Fri)',
    156: '3 days/week',
    104: '2 days/week',
    52:  'Weekly',
    26:  'Bi-weekly',
    24:  'Twice/month',
    12:  'Monthly',
    6:   'Every 2 months',
    4:   'Quarterly',
    2:   'Semi-annually',
    1:   'Annually',
  }
  return map[freq] ?? `${freq}×/year`
}

function todayStr() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ─── Shared Report Header ─────────────────────────────────────────────────────

function ReportHeader({ title, prospect, building }: { title: string; prospect: Prospect; building: Building }) {
  return (
    <div className="mb-6 pb-4 border-b-2 border-gray-800">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-sm text-gray-600">
        <span><span className="font-semibold text-gray-800">Prospect:</span> {prospect.company_name}</span>
        <span><span className="font-semibold text-gray-800">Building:</span> {building.building_name}</span>
        <span><span className="font-semibold text-gray-800">Date:</span> {todayStr()}</span>
      </div>
    </div>
  )
}

// ─── Pie Chart ────────────────────────────────────────────────────────────────

interface PieSegment { label: string; value: number; color: string; pct: string }

function PieChart({ segments }: { segments: PieSegment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return null

  const cx = 90, cy = 90, r = 82
  let cumAngle = -Math.PI / 2

  const paths = segments.map(seg => {
    const slice = (seg.value / total) * 2 * Math.PI
    const startAngle = cumAngle
    cumAngle += slice
    const endAngle = cumAngle
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const largeArc = slice > Math.PI ? 1 : 0
    return { ...seg, d: `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${largeArc},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z` }
  })

  return (
    <div className="flex items-center gap-6">
      <svg width="180" height="180" viewBox="0 0 180 180" className="flex-shrink-0">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth="2" />
        ))}
      </svg>
      <div className="space-y-2">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-700">{seg.label}</span>
            <span className="font-semibold text-gray-900 ml-auto pl-4 tabular-nums">{seg.pct}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Report 1 & 2: Scope of Work ─────────────────────────────────────────────

function ScopeOfWorkReport({
  data,
  withTaskCodes,
  includeSpanish,
}: {
  data: ReportData
  withTaskCodes: boolean
  includeSpanish: boolean
}) {
  const title = withTaskCodes
    ? 'Work Load Specifications / Scope of Work (with Task Codes)'
    : 'Work Load Specifications / Scope of Work'

  const printAreas = data.areas
    .map(area => ({ ...area, task_line_items: area.task_line_items.filter(t => t.print) }))
    .filter(area => area.task_line_items.length > 0)

  const colCount = (withTaskCodes ? 1 : 0) + 2 + (includeSpanish ? 1 : 0) + 1

  return (
    <div className="report-section">
      <ReportHeader title={title} prospect={data.prospect} building={data.building} />
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            {withTaskCodes && (
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold whitespace-nowrap">Task Code</th>
            )}
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Area</th>
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Task Description</th>
            {includeSpanish && (
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Descripción (es)</th>
            )}
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold whitespace-nowrap">Frequency</th>
          </tr>
        </thead>
        <tbody>
          {printAreas.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="border border-gray-300 px-3 py-6 text-center text-gray-400 italic">
                No printable tasks found for this building
              </td>
            </tr>
          ) : (
            printAreas.map((area, ai) =>
              area.task_line_items.map((task, ti) => (
                <tr key={task.id} className={ai % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {withTaskCodes && (
                    <td className="border border-gray-300 px-3 py-1.5 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {task.task_codes?.task_code ?? '—'}
                    </td>
                  )}
                  <td className="border border-gray-300 px-3 py-1.5 font-medium text-gray-800 whitespace-nowrap">
                    {ti === 0 ? area.area_name : ''}
                  </td>
                  <td className="border border-gray-300 px-3 py-1.5 text-gray-700">
                    {task.task_name ?? '—'}
                  </td>
                  {includeSpanish && (
                    <td className="border border-gray-300 px-3 py-1.5 text-gray-500 italic">
                      {task.task_codes?.task_name ?? '—'}
                    </td>
                  )}
                  <td className="border border-gray-300 px-3 py-1.5 whitespace-nowrap text-gray-600">
                    {fmtFreq(task.frequency)}
                  </td>
                </tr>
              ))
            )
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Report 3: Work Load Development Summary ──────────────────────────────────

function WorkLoadSummaryReport({ data }: { data: ReportData }) {
  const allTasks    = data.areas.flatMap(a => a.task_line_items)
  const annualHours = allTasks.reduce((s, t) => s + (t.yearly_hrs ?? 0), 0)
  const monthlyAvg  = annualHours / 12
  const weeklyAvg   = annualHours / 52
  const dailyAvg    = annualHours / 260

  // Use mode of area frequencies as site frequency for staff calc
  const freqs = data.areas.map(a => a.frequency).filter((f): f is number => f != null)
  const siteFreq = freqs.length > 0
    ? freqs.sort((a, b) =>
        freqs.filter(f => f === b).length - freqs.filter(f => f === a).length
      )[0]
    : 260
  const staffRequired = siteFreq > 0 ? annualHours / 8 / siteFreq : 0

  const rows = [
    { label: 'Total Annual Hours',    value: `${fmtHrs(annualHours)} hrs` },
    { label: 'Monthly Average Hours', value: `${fmtHrs(monthlyAvg)} hrs` },
    { label: 'Weekly Average Hours',  value: `${fmtHrs(weeklyAvg)} hrs` },
    { label: 'Daily Average Hours',   value: `${fmtHrs(dailyAvg)} hrs` },
    { label: 'Total Staff Required',  value: staffRequired.toFixed(2) },
  ]

  return (
    <div className="report-section">
      <ReportHeader title="Work Load Development Summary" prospect={data.prospect} building={data.building} />
      <div className="max-w-sm">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {rows.map(row => (
              <tr key={row.label}>
                <td className="py-2.5 pr-8 text-gray-600">{row.label}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums text-gray-900">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-xs text-gray-400">
          Staff Required = Annual Hours ÷ 8 hrs/shift ÷ {siteFreq} visits/year
        </p>
      </div>
    </div>
  )
}

// ─── Report 4: Work Load Development Detail ───────────────────────────────────

function WorkLoadDetailReport({ data }: { data: ReportData }) {
  const allTasks = data.areas.flatMap(a => a.task_line_items)
  const grandYearly  = allTasks.reduce((s, t) => s + (t.yearly_hrs  ?? 0), 0)
  const grandMonthly = allTasks.reduce((s, t) => s + (t.monthly_hrs ?? 0), 0)
  const grandWeekly  = allTasks.reduce((s, t) => s + (t.weekly_hrs  ?? 0), 0)
  const grandDaily   = allTasks.reduce((s, t) => s + (t.daily_hrs   ?? 0), 0)

  return (
    <div className="report-section">
      <ReportHeader title="Work Load Development Detail" prospect={data.prospect} building={data.building} />
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Area / Task</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold whitespace-nowrap">Annual Hrs</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold whitespace-nowrap">Monthly Hrs</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold whitespace-nowrap">Weekly Hrs</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold whitespace-nowrap">Daily Hrs</th>
          </tr>
        </thead>
        <tbody>
          {data.areas.map(area => {
            const areaYearly  = area.task_line_items.reduce((s, t) => s + (t.yearly_hrs  ?? 0), 0)
            const areaMonthly = area.task_line_items.reduce((s, t) => s + (t.monthly_hrs ?? 0), 0)
            const areaWeekly  = area.task_line_items.reduce((s, t) => s + (t.weekly_hrs  ?? 0), 0)
            const areaDaily   = area.task_line_items.reduce((s, t) => s + (t.daily_hrs   ?? 0), 0)

            return (
              <>
                <tr key={`h-${area.id}`} className="bg-gray-50">
                  <td colSpan={5} className="border border-gray-300 px-3 py-1.5 font-semibold text-gray-800">
                    {area.area_name}
                  </td>
                </tr>
                {area.task_line_items.map(task => (
                  <tr key={task.id}>
                    <td className="border border-gray-300 px-3 py-1 pl-7 text-gray-700">{task.task_name ?? '—'}</td>
                    <td className="border border-gray-300 px-3 py-1 text-right tabular-nums">{fmtHrs(task.yearly_hrs)}</td>
                    <td className="border border-gray-300 px-3 py-1 text-right tabular-nums">{fmtHrs(task.monthly_hrs)}</td>
                    <td className="border border-gray-300 px-3 py-1 text-right tabular-nums">{fmtHrs(task.weekly_hrs)}</td>
                    <td className="border border-gray-300 px-3 py-1 text-right tabular-nums">{fmtHrs(task.daily_hrs)}</td>
                  </tr>
                ))}
                <tr key={`s-${area.id}`} className="bg-gray-50 font-semibold text-gray-700">
                  <td className="border border-gray-300 px-3 py-1 pl-7 text-xs italic text-gray-400">Area Subtotal</td>
                  <td className="border border-gray-300 px-3 py-1 text-right tabular-nums">{fmtHrs(areaYearly)}</td>
                  <td className="border border-gray-300 px-3 py-1 text-right tabular-nums">{fmtHrs(areaMonthly)}</td>
                  <td className="border border-gray-300 px-3 py-1 text-right tabular-nums">{fmtHrs(areaWeekly)}</td>
                  <td className="border border-gray-300 px-3 py-1 text-right tabular-nums">{fmtHrs(areaDaily)}</td>
                </tr>
              </>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-200 font-bold">
            <td className="border border-gray-300 px-3 py-2">Grand Total</td>
            <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">{fmtHrs(grandYearly)}</td>
            <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">{fmtHrs(grandMonthly)}</td>
            <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">{fmtHrs(grandWeekly)}</td>
            <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">{fmtHrs(grandDaily)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── Report 5: Work Load by Position ─────────────────────────────────────────

function WorkLoadByPositionReport({ data }: { data: ReportData }) {
  const allTasks    = data.areas.flatMap(a => a.task_line_items)
  const totalYearly = allTasks.reduce((s, t) => s + (t.yearly_hrs ?? 0), 0)

  const byPosition = new Map<string, { yearly: number; monthly: number; weekly: number }>()
  for (const task of allTasks) {
    const pos = task.positions?.position_name ?? 'Unassigned'
    const cur = byPosition.get(pos) ?? { yearly: 0, monthly: 0, weekly: 0 }
    byPosition.set(pos, {
      yearly:  cur.yearly  + (task.yearly_hrs  ?? 0),
      monthly: cur.monthly + (task.monthly_hrs ?? 0),
      weekly:  cur.weekly  + (task.weekly_hrs  ?? 0),
    })
  }

  const rows = [...byPosition.entries()].sort((a, b) => b[1].yearly - a[1].yearly)

  return (
    <div className="report-section">
      <ReportHeader title="Work Load by Position" prospect={data.prospect} building={data.building} />
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Position</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold whitespace-nowrap">Annual Hours</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold whitespace-nowrap">Monthly Hours</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold whitespace-nowrap">Weekly Hours</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold whitespace-nowrap">% of Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([position, hrs]) => (
            <tr key={position} className="border-b border-gray-100">
              <td className="border border-gray-300 px-3 py-1.5 font-medium text-gray-800">{position}</td>
              <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums">{fmtHrs(hrs.yearly)}</td>
              <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums">{fmtHrs(hrs.monthly)}</td>
              <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums">{fmtHrs(hrs.weekly)}</td>
              <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums">
                {totalYearly > 0 ? `${((hrs.yearly / totalYearly) * 100).toFixed(1)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-bold">
            <td className="border border-gray-300 px-3 py-2">Total</td>
            <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">
              {fmtHrs(rows.reduce((s, [, h]) => s + h.yearly, 0))}
            </td>
            <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">
              {fmtHrs(rows.reduce((s, [, h]) => s + h.monthly, 0))}
            </td>
            <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">
              {fmtHrs(rows.reduce((s, [, h]) => s + h.weekly, 0))}
            </td>
            <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── Report 6: Investment Recap ───────────────────────────────────────────────

function InvestmentRecapReport({ data }: { data: ReportData }) {
  const { bidSummary, bidLaborLines, bidLaborCosts, bidOtherCosts, building } = data

  if (!bidSummary) {
    return (
      <div className="report-section">
        <ReportHeader title="Investment Recap / Bidding Report" prospect={data.prospect} building={data.building} />
        <p className="text-gray-400 italic text-sm">No bid data available for this building.</p>
      </div>
    )
  }

  const totals = calcBidTotals(
    bidLaborLines,
    bidLaborCosts,
    bidOtherCosts,
    bidSummary.margin_type,
    bidSummary.margin_value,
    building.square_feet,
    bidSummary.vacation_pct,
    bidSummary.vacation_hours_override,
    bidSummary.sick_hours_override,
    bidSummary.vacation_rate,
    bidSummary.sick_rate,
  )

  const profit = totals.sellingPrice - totals.totalCost
  const pieSegments: PieSegment[] = [
    { label: 'Total Labor',         value: totals.totalLabor,       color: '#2563eb' },
    { label: 'Labor Related Costs', value: totals.totalLaborRelated, color: '#16a34a' },
    { label: 'Other Direct Costs',  value: totals.totalOtherDirect,  color: '#ea580c' },
    { label: 'Profit',              value: Math.max(0, profit),      color: '#7c3aed' },
  ]
    .filter(s => s.value > 0)
    .map(s => ({
      ...s,
      pct: totals.sellingPrice > 0
        ? `${((s.value / totals.sellingPrice) * 100).toFixed(1)}%`
        : '0%',
    }))

  const costTypeLabel = (type: string) =>
    type === 'percent_markup' ? '% of Labor' : type === 'per_hour' ? '$/hr' : '$/yr'

  const factorDisplay = (type: string, factor: number | null) => {
    if (factor == null) return '—'
    return type === 'percent_markup' ? `${factor}%` : fmt$(factor)
  }

  return (
    <div className="report-section">
      <ReportHeader title="Investment Recap / Bidding Report" prospect={data.prospect} building={data.building} />

      {/* Section 1 — Labor */}
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
        Section 1 — Labor by Position
      </h3>
      <table className="w-full text-sm border-collapse mb-7">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Position</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold whitespace-nowrap">Annual Hours</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold whitespace-nowrap">Rate ($/hr)</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold whitespace-nowrap">Annual Cost</th>
          </tr>
        </thead>
        <tbody>
          {bidLaborLines.map(line => (
            <tr key={line.id} className="border-b border-gray-100">
              <td className="border border-gray-300 px-3 py-1.5">{line.positions?.position_name ?? '—'}</td>
              <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums">{fmtHrs(line.annual_hours)}</td>
              <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums">{fmt$(line.rate)}</td>
              <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums">
                {fmt$(calcPositionCost(line.annual_hours, line.rate))}
              </td>
            </tr>
          ))}
          <tr className="bg-gray-50 text-xs text-gray-500 italic">
            <td colSpan={3} className="border border-gray-300 px-3 py-1.5">
              Vacation ({bidSummary.vacation_pct}% / {totals.vacationHours.toFixed(1)} hrs @ {fmt$(bidSummary.vacation_rate)}/hr)
            </td>
            <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums not-italic text-gray-700 font-medium">
              {fmt$(totals.vacationCost)}
            </td>
          </tr>
          <tr className="bg-gray-50 text-xs text-gray-500 italic">
            <td colSpan={3} className="border border-gray-300 px-3 py-1.5">
              Sick Time ({totals.sickHours.toFixed(1)} hrs @ {fmt$(bidSummary.sick_rate)}/hr)
            </td>
            <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums not-italic text-gray-700 font-medium">
              {fmt$(totals.sickCost)}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="bg-gray-200 font-bold">
            <td colSpan={3} className="border border-gray-300 px-3 py-2">Total Labor</td>
            <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">{fmt$(totals.totalLabor)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Section 2 — Labor Related Costs */}
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
        Section 2 — Labor Related Costs
      </h3>
      <table className="w-full text-sm border-collapse mb-7">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Description</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Type</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Factor</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold whitespace-nowrap">Annual Cost</th>
          </tr>
        </thead>
        <tbody>
          {bidLaborCosts.map(cost => (
            <tr key={cost.id} className="border-b border-gray-100">
              <td className="border border-gray-300 px-3 py-1.5">{cost.description ?? '—'}</td>
              <td className="border border-gray-300 px-3 py-1.5 text-right text-xs text-gray-500">
                {costTypeLabel(cost.type)}
              </td>
              <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums">
                {factorDisplay(cost.type, cost.factor)}
              </td>
              <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums">
                {fmt$(calcCostLine(cost.type, cost.factor, totals.totalLabor, totals.totalHours))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-200 font-bold">
            <td colSpan={3} className="border border-gray-300 px-3 py-2">Total Labor Related Costs</td>
            <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">
              {fmt$(totals.totalLaborRelated)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Section 3 — Other Direct Costs */}
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
        Section 3 — Other Direct Costs
      </h3>
      <table className="w-full text-sm border-collapse mb-7">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Description</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Type</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Factor</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold whitespace-nowrap">Annual Cost</th>
          </tr>
        </thead>
        <tbody>
          {bidOtherCosts.map(cost => (
            <tr key={cost.id} className="border-b border-gray-100">
              <td className="border border-gray-300 px-3 py-1.5">{cost.description ?? '—'}</td>
              <td className="border border-gray-300 px-3 py-1.5 text-right text-xs text-gray-500">
                {costTypeLabel(cost.type)}
              </td>
              <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums">
                {factorDisplay(cost.type, cost.factor)}
              </td>
              <td className="border border-gray-300 px-3 py-1.5 text-right tabular-nums">
                {fmt$(calcCostLine(cost.type, cost.factor, totals.totalLabor, totals.totalHours))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-200 font-bold">
            <td colSpan={3} className="border border-gray-300 px-3 py-2">Total Other Direct Costs</td>
            <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">
              {fmt$(totals.totalOtherDirect)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Pricing Summary + Pie Chart */}
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
        Pricing Summary
      </h3>
      <div className="flex flex-wrap gap-10 items-start">
        <table className="text-sm">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-1.5 pr-10 text-gray-600">Total Cost</td>
              <td className="py-1.5 text-right tabular-nums font-medium">{fmt$(totals.totalCost)}</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-10 text-gray-600">
                {bidSummary.margin_type === 'percent'
                  ? `Gross Margin (${bidSummary.margin_value}%)`
                  : 'Fixed Fee'}
              </td>
              <td className="py-1.5 text-right tabular-nums font-medium">{fmt$(profit)}</td>
            </tr>
            <tr className="border-t-2 border-gray-800 font-bold text-gray-900">
              <td className="py-2 pr-10">Selling Price / Year</td>
              <td className="py-2 text-right tabular-nums text-lg">{fmt$(totals.sellingPrice)}</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-10 text-gray-600">Price / Month</td>
              <td className="py-1.5 text-right tabular-nums font-medium">{fmt$(totals.pricePerMonth)}</td>
            </tr>
            {building.square_feet != null && (
              <>
                <tr>
                  <td className="py-1.5 pr-10 text-gray-600">$/Sq Ft (Annual)</td>
                  <td className="py-1.5 text-right tabular-nums font-medium">
                    {totals.sqftAnnual != null ? `$${totals.sqftAnnual.toFixed(4)}` : '—'}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-10 text-gray-600">$/Sq Ft (Monthly)</td>
                  <td className="py-1.5 text-right tabular-nums font-medium">
                    {totals.sqftMonthly != null ? `$${totals.sqftMonthly.toFixed(4)}` : '—'}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Cost Breakdown</p>
          <PieChart segments={pieSegments} />
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ReportsView({ prospects }: { prospects: Prospect[] }) {
  const [selectedProspectId, setSelectedProspectId] = useState('')
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [buildings, setBuildings] = useState<Building[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [includeSpanish, setIncludeSpanish] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!selectedProspectId) {
      setBuildings([])
      setSelectedBuildingId('')
      setReportData(null)
      return
    }
    async function fetchBuildings() {
      const { data } = await supabase
        .from('buildings')
        .select('id, building_name, square_feet')
        .eq('prospect_id', selectedProspectId)
        .order('building_name')
      setBuildings(data ?? [])
      setSelectedBuildingId('')
      setReportData(null)
    }
    void fetchBuildings()
  }, [selectedProspectId, supabase])

  useEffect(() => {
    setReportData(null)
  }, [selectedBuildingId])

  function toggleReport(key: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(key)) { next.delete(key) } else { next.add(key) }
      return next
    })
  }

  async function handleGenerate() {
    if (!selectedProspectId || !selectedBuildingId || checked.size === 0) return
    setIsGenerating(true)
    setError(null)

    try {
      const prospect = prospects.find(p => p.id === selectedProspectId)!
      const building = buildings.find(b => b.id === selectedBuildingId)!

      const [
        { data: areas, error: areasErr },
        { data: bidSummary },
        { data: bidLaborLines },
        { data: bidLaborCosts },
        { data: bidOtherCosts },
      ] = await Promise.all([
        supabase
          .from('areas')
          .select('*, task_line_items(*, task_codes(task_code, task_name), positions(position_name))')
          .eq('building_id', selectedBuildingId)
          .order('print_order', { nullsFirst: false })
          .order('created_at'),
        supabase
          .from('bid_summary')
          .select('*')
          .eq('building_id', selectedBuildingId)
          .maybeSingle(),
        supabase
          .from('bid_labor_lines')
          .select('*, positions(position_name)')
          .eq('building_id', selectedBuildingId)
          .order('sort_order', { nullsFirst: false })
          .order('created_at'),
        supabase
          .from('bid_labor_costs')
          .select('*')
          .eq('building_id', selectedBuildingId)
          .order('sort_order', { nullsFirst: false })
          .order('created_at'),
        supabase
          .from('bid_other_costs')
          .select('*')
          .eq('building_id', selectedBuildingId)
          .order('sort_order', { nullsFirst: false })
          .order('created_at'),
      ])

      if (areasErr) throw areasErr

      const sortedAreas: Area[] = ((areas ?? []) as Area[]).map(a => ({
        ...a,
        task_line_items: [...a.task_line_items].sort((x, y) => {
          if (x.created_at && y.created_at) {
            return new Date(x.created_at).getTime() - new Date(y.created_at).getTime()
          }
          return 0
        }),
      }))

      setReportData({
        prospect,
        building,
        areas: sortedAreas,
        bidSummary: bidSummary ?? null,
        bidLaborLines: (bidLaborLines ?? []) as ReportData['bidLaborLines'],
        bidLaborCosts: (bidLaborCosts ?? []) as BidLaborCost[],
        bidOtherCosts: (bidOtherCosts ?? []) as BidOtherCost[],
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate reports. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const canGenerate   = !!selectedProspectId && !!selectedBuildingId && checked.size > 0
  const anyScope      = checked.has('scope_no_codes') || checked.has('scope_with_codes')

  return (
    <>
      {/* Print styles: show only report output, hide dashboard chrome */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-print-area, #report-print-area * { visibility: visible; }
          #report-print-area {
            position: fixed; top: 0; left: 0;
            width: 100%; padding: 32px;
            background: white;
          }
          .report-section { break-before: page; padding-top: 24px; }
          .report-section:first-child { break-before: avoid; padding-top: 0; }
        }
      `}</style>

      <div className="flex h-full overflow-hidden">

        {/* ── Controls sidebar ──────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto flex flex-col gap-5 p-5 print:hidden">

          {/* Prospect */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Prospect
            </label>
            <select
              value={selectedProspectId}
              onChange={e => setSelectedProspectId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select prospect…</option>
              {prospects.map(p => (
                <option key={p.id} value={p.id}>{p.company_name}</option>
              ))}
            </select>
          </div>

          {/* Building */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Building
            </label>
            <select
              value={selectedBuildingId}
              onChange={e => setSelectedBuildingId(e.target.value)}
              disabled={buildings.length === 0}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {selectedProspectId && buildings.length === 0 ? 'No buildings found' : 'Select building…'}
              </option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.building_name}</option>
              ))}
            </select>
          </div>

          {/* Report selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Reports</span>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setChecked(new Set(REPORT_OPTIONS.map(r => r.key)))}
                  className="text-brand-600 hover:text-brand-800"
                >
                  All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => setChecked(new Set())}
                  className="text-gray-500 hover:text-gray-700"
                >
                  None
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400 font-medium mt-1 mb-0.5">Workload</p>
            {WORKLOAD_REPORTS.map(r => (
              <label key={r.key} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked.has(r.key)}
                  onChange={() => toggleReport(r.key)}
                  className="mt-0.5 accent-brand-600"
                />
                <span className="text-sm text-gray-700 leading-snug">{r.label}</span>
              </label>
            ))}

            <p className="text-xs text-gray-400 font-medium mt-2 mb-0.5">Bidding</p>
            {BIDDING_REPORTS.map(r => (
              <label key={r.key} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked.has(r.key)}
                  onChange={() => toggleReport(r.key)}
                  className="mt-0.5 accent-brand-600"
                />
                <span className="text-sm text-gray-700 leading-snug">{r.label}</span>
              </label>
            ))}
          </div>

          {/* Spanish option (only relevant for scope reports) */}
          {anyScope && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Options</p>
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSpanish}
                  onChange={e => setIncludeSpanish(e.target.checked)}
                  className="accent-brand-600"
                />
                <span className="text-sm text-gray-700">Include Spanish column</span>
              </label>
            </div>
          )}

          {/* Generate */}
          <div className="mt-auto pt-4 border-t border-gray-200 space-y-2">
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              {isGenerating ? 'Generating…' : 'Generate Reports'}
            </button>
          </div>
        </div>

        {/* ── Report output area ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {!reportData ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-3">
              <svg className="w-16 h-16 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="font-medium text-gray-500">No report generated yet</p>
              <p className="text-sm text-gray-400">
                Select a prospect, building, and at least one report, then click Generate
              </p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 print:hidden">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{reportData.prospect.company_name}</span>
                  <span className="mx-2 text-gray-300">·</span>
                  {reportData.building.building_name}
                  <span className="mx-2 text-gray-300">·</span>
                  <span className="text-gray-400">{checked.size} report{checked.size !== 1 ? 's' : ''}</span>
                </p>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 border border-gray-300 hover:border-gray-400 text-gray-700 bg-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
              </div>

              {/* Report pages */}
              <div id="report-print-area" className="p-8 max-w-5xl mx-auto space-y-14">
                {checked.has('scope_no_codes') && (
                  <ScopeOfWorkReport data={reportData} withTaskCodes={false} includeSpanish={includeSpanish} />
                )}
                {checked.has('scope_with_codes') && (
                  <ScopeOfWorkReport data={reportData} withTaskCodes={true} includeSpanish={includeSpanish} />
                )}
                {checked.has('wl_summary') && (
                  <WorkLoadSummaryReport data={reportData} />
                )}
                {checked.has('wl_detail') && (
                  <WorkLoadDetailReport data={reportData} />
                )}
                {checked.has('wl_by_position') && (
                  <WorkLoadByPositionReport data={reportData} />
                )}
                {checked.has('investment_recap') && (
                  <InvestmentRecapReport data={reportData} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
