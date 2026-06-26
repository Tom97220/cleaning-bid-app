'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
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

export interface CompanySettings {
  id: string
  company_name: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
}


interface Prospect { id: string; company_name: string }
interface Building {
  id: string
  building_name: string
  square_feet: number | null
  address: string | null
  address_2: string | null
  city: string | null
  state: string | null
  zip: string | null
  floors: number | null
  notes: string | null
  service_days: number | null
}

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
  task_codes: { task_code: string; task_name: string; description: string | null; description_alt: string | null } | null
  positions: { position_name: string } | null
}

interface Area {
  id: string
  area_name: string
  print_order: number | null
  frequency: number | null
  created_at: string
  task_line_items: TaskLineItem[]
  square_footage: number | null
  carpet_sqft: number | null
  tile_vct_sqft: number | null
  other_sqft: number | null
  fixtures: number | null
  room_count: number | null
  sinks: number | null
  showers: number | null
  fountains: number | null
  stairwells: number | null
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
  { key: 'cover_page',       label: 'Cover Page',                          category: 'Document', isScope: false },
  { key: 'pinpoint',         label: 'Pinpoint',                            category: 'Document', isScope: false },
  { key: 'scope_no_codes',   label: 'Scope of Work (without task codes)',   category: 'Workload', isScope: true  },
  { key: 'scope_with_codes', label: 'Scope of Work (with task codes)',      category: 'Workload', isScope: true  },
  { key: 'scope_no_codes_es', label: 'Scope of Work – Spanish Version (no task codes)', category: 'Workload', isScope: true  },
  { key: 'wl_summary',       label: 'Work Load Development Summary',        category: 'Workload', isScope: false },
  { key: 'wl_detail',        label: 'Work Load Development Detail',         category: 'Workload', isScope: false },
  { key: 'wl_by_position',   label: 'Work Load by Position',                category: 'Workload', isScope: false },
  { key: 'investment_recap', label: 'Investment Recap / Bidding Report',    category: 'Bidding',  isScope: false },
]

const DOCUMENT_REPORTS = REPORT_OPTIONS.filter(r => r.category === 'Document')
const WORKLOAD_REPORTS  = REPORT_OPTIONS.filter(r => r.category === 'Workload')
const BIDDING_REPORTS   = REPORT_OPTIONS.filter(r => r.category === 'Bidding')

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt$ = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

const fmtHrs = (n: number | null | undefined) =>
  n == null ? '—' : n.toFixed(2)

const fmtFreq = (freq: number | null, spanish = false): string => {
  if (!freq) return '—'
  const map: Record<number, string> = {
    365: 'Daily',          260: 'Daily',
    156: '3x/week',        104: '2x/week',
    52:  'Weekly',         26:  'Bi-weekly',
    24:  '2x/month',       12:  'Monthly',
    6:   'Every 2 months', 4:   'Quarterly',
    2:   'Semi-annually',  1:   'Annually',
  }
  const mapEs: Record<number, string> = {
    365: 'Diario',         260: 'Diario',
    156: '3x/semana',      104: '2x/semana',
    52:  'Semanal',        26:  'Quincenal',
    24:  '2x/mes',         12:  'Mensual',
    6:   'Bimestral',      4:   'Trimestral',
    2:   'Semestral',      1:   'Anual',
  }
  if (spanish) return mapEs[freq] ?? `${freq}x/año`
  return map[freq] ?? `${freq}x/year`
}



// ─── Table styles ─────────────────────────────────────────────────────────────

const th = 'border border-gray-300 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 bg-gray-50'
const thR = 'border border-gray-300 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 bg-gray-50'
const td = 'border border-gray-300 px-3 py-1.5 text-sm text-gray-700'
const tdR = 'border border-gray-300 px-3 py-1.5 text-sm text-right tabular-nums text-gray-700'
const tfootTd = 'border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 bg-gray-100'
const tfootTdR = 'border border-gray-300 px-3 py-2 text-sm font-semibold text-right tabular-nums text-gray-900 bg-gray-100'

// ─── Report Header ────────────────────────────────────────────────────────────

function ReportHeader({
  title,
  prospect,
  building,
  logoUrl = null,
}: {
  title: string
  prospect: Prospect
  building: Building
  logoUrl?: string | null
}) {
  return (
    <div className="mb-8">
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="Company logo" className="h-12 w-auto object-contain mb-3" />
      )}
      <div className="border-t-2 border-gray-800 mb-0.5" />
      <div className="border-t border-gray-800 mb-7" />

      <div className="text-center">
        <h2 className="text-base font-bold uppercase tracking-widest text-gray-900 leading-snug">
          {title}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium">{prospect.company_name}</span>
          {building.building_name && (
            <> &mdash; {building.building_name}</>
          )}
        </p>
      </div>

      <div className="mt-6 border-t border-gray-300" />
    </div>
  )
}

// ─── Cover Page ───────────────────────────────────────────────────────────────

function CoverPage({
  data,
  company,
  includeLogo,
}: {
  data: ReportData
  company: CompanySettings | null
  includeLogo: boolean
}) {
  return (
    <div
      className="cover-page relative flex flex-col bg-white"
      style={{ minHeight: '1050px' }}
    >
      <div className="text-center pt-16 px-16">
        {includeLogo && company?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logo_url}
            alt="Company logo"
            className="h-16 w-auto object-contain mx-auto mb-4"
          />
        )}
        {company?.company_name && (
          <p className="text-xl font-bold tracking-wide text-gray-900">{company.company_name}</p>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-16 text-center">
        <div className="w-full border-t-2 border-gray-800 mb-0.5" />
        <div className="w-full border-t border-gray-800 mb-10" />

        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
          Building Services Analysis
        </p>
        <h1 className="text-4xl font-bold text-gray-900 mb-2 leading-tight">
          {data.building.building_name}
        </h1>
        <p className="text-lg text-gray-600 mb-10">{data.prospect.company_name}</p>

        <div className="w-full border-t border-gray-800 mb-0.5" />
        <div className="w-full border-t-2 border-gray-800" />
      </div>

      <div className="text-center pb-16 px-16">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">Presented by</p>
        {company?.company_name ? (
          <p className="font-semibold text-gray-800">{company.company_name}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">
            Add company details in Admin &rsaquo; Company Settings
          </p>
        )}
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
    const start = cumAngle; cumAngle += slice
    const x1 = cx + r * Math.cos(start),  y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(cumAngle), y2 = cy + r * Math.sin(cumAngle)
    return { ...seg, d: `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${slice > Math.PI ? 1 : 0},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z` }
  })
  return (
    <div className="flex items-center gap-6">
      <svg width="180" height="180" viewBox="0 0 180 180" className="flex-shrink-0">
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth="2" />)}
      </svg>
      <div className="space-y-2">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-700">{seg.label}</span>
            <span className="font-semibold text-gray-900 ml-auto pl-6 tabular-nums">{seg.pct}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Report 1 & 2: Scope of Work ─────────────────────────────────────────────

function ScopeOfWorkReport({
  data, withTaskCodes, useAltDescription = false, logoUrl = null,
}: {
  data: ReportData; withTaskCodes: boolean; useAltDescription?: boolean; logoUrl?: string | null
}) {
  const title = useAltDescription
    ? 'Work Load Specifications / Scope of Work (Spanish)'
    : withTaskCodes
      ? 'Work Load Specifications / Scope of Work (with Task Codes)'
      : 'Work Load Specifications / Scope of Work'

  const printAreas = data.areas
    .map(area => ({ ...area, task_line_items: area.task_line_items.filter(t => t.print) }))
    .filter(area => area.task_line_items.length > 0)

  return (
    <div className="report-section text-[11px]">
      <ReportHeader title={title} prospect={data.prospect} building={data.building} logoUrl={logoUrl} />

      {printAreas.length === 0 ? (
        <p className="py-8 text-center text-gray-400 italic text-sm">
          No printable tasks found for this building
        </p>
      ) : (
        printAreas.map(area => (
          <div key={area.id} className="break-inside-avoid mt-6 first:mt-0">
            {/* thick opening rule */}
            <div className="border-t-2 border-gray-800" />

            {/* area heading: name on the left, Frequency label on the right */}
            <div className="flex items-baseline justify-between pt-1.5 pb-1 border-b border-gray-300">
              <span className="font-bold italic text-gray-800">Area: {area.area_name}</span>
              <span className="font-bold text-gray-700">Frequency</span>
            </div>

            {/* scope lines */}
            <table className="w-full border-collapse">
              <tbody>
                {area.task_line_items.map(task => (
                  <tr key={task.id}>
                    {withTaskCodes && (
                      <td className="py-1 pl-[18px] pr-3 align-top whitespace-nowrap w-16">
                        <span className="font-mono text-gray-500">
                          {task.task_codes?.task_code ?? ''}
                        </span>
                      </td>
                    )}
                    <td className={`py-1 pr-8 align-top text-gray-700${withTaskCodes ? '' : ' pl-[18px]'}`}>
                      {useAltDescription
                        ? (task.task_codes?.description_alt || task.task_codes?.description) ?? ''
                        : task.task_codes?.description ?? ''}
                    </td>
                    <td className="py-1 text-right align-top whitespace-nowrap w-28 text-gray-600">
                      {fmtFreq(task.frequency, useAltDescription)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* thin closing rule */}
            <div className="border-t border-gray-300" />
          </div>
        ))
      )}
    </div>
  )
}

// ─── Report 3: Work Load Development Summary ──────────────────────────────────

function WorkLoadSummaryReport({ data }: { data: ReportData }) {
  const allTasks    = data.areas.flatMap(a => a.task_line_items)
  const annualHours = allTasks.reduce((s, t) => s + (t.yearly_hrs ?? 0), 0)

  const freqs    = data.areas.map(a => a.frequency).filter((f): f is number => f != null)
  const siteFreq = freqs.length > 0
    ? freqs.sort((a, b) => freqs.filter(f => f === b).length - freqs.filter(f => f === a).length)[0]
    : 260
  const staff = siteFreq > 0 ? annualHours / 8 / siteFreq : 0

  const rows = [
    { label: 'Daily Average Hours',   value: `${fmtHrs(annualHours / 260)} hrs` },
    { label: 'Weekly Average Hours',  value: `${fmtHrs(annualHours / 52)} hrs` },
    { label: 'Monthly Average Hours', value: `${fmtHrs(annualHours / 12)} hrs` },
    { label: 'Total Annual Hours',    value: `${fmtHrs(annualHours)} hrs` },
    { label: 'Total Staff Required',  value: `${staff.toFixed(2)} FTE` },
  ]

  return (
    <div className="report-section">
      <ReportHeader title="Work Load Development Summary" prospect={data.prospect} building={data.building} />
      <div className="max-w-sm">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {rows.map(row => (
              <tr key={row.label}>
                <td className="py-3 pr-8 text-gray-600">{row.label}</td>
                <td className="py-3 text-right font-semibold tabular-nums text-gray-900">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Report 4: Work Load Development Detail ───────────────────────────────────

function WorkLoadDetailReport({ data }: { data: ReportData }) {
  const allTasks = data.areas.flatMap(a => a.task_line_items)
  const grand = {
    yearly:  allTasks.reduce((s, t) => s + (t.yearly_hrs  ?? 0), 0),
    monthly: allTasks.reduce((s, t) => s + (t.monthly_hrs ?? 0), 0),
    weekly:  allTasks.reduce((s, t) => s + (t.weekly_hrs  ?? 0), 0),
    daily:   allTasks.reduce((s, t) => s + (t.daily_hrs   ?? 0), 0),
  }

  return (
    <div className="report-section">
      <ReportHeader title="Work Load Development Detail" prospect={data.prospect} building={data.building} />
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className={th}>Area / Task</th>
            <th className={thR}>Daily Hrs</th>
            <th className={thR}>Weekly Hrs</th>
            <th className={thR}>Monthly Hrs</th>
            <th className={thR}>Annual Hrs</th>
          </tr>
        </thead>
        <tbody>
          {data.areas.map(area => {
            const sub = {
              yearly:  area.task_line_items.reduce((s, t) => s + (t.yearly_hrs  ?? 0), 0),
              monthly: area.task_line_items.reduce((s, t) => s + (t.monthly_hrs ?? 0), 0),
              weekly:  area.task_line_items.reduce((s, t) => s + (t.weekly_hrs  ?? 0), 0),
              daily:   area.task_line_items.reduce((s, t) => s + (t.daily_hrs   ?? 0), 0),
            }
            return (
              <>
                <tr key={`h-${area.id}`}>
                  <td colSpan={5} className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 bg-gray-50">
                    {area.area_name}
                  </td>
                </tr>
                {area.task_line_items.map(task => (
                  <tr key={task.id}>
                    <td className={`${td} pl-7`}>{task.task_name ?? '—'}</td>
                    <td className={tdR}>{fmtHrs(task.daily_hrs)}</td>
                    <td className={tdR}>{fmtHrs(task.weekly_hrs)}</td>
                    <td className={tdR}>{fmtHrs(task.monthly_hrs)}</td>
                    <td className={tdR}>{fmtHrs(task.yearly_hrs)}</td>
                  </tr>
                ))}
                <tr key={`s-${area.id}`}>
                  <td className={`${td} pl-7 italic text-xs text-gray-400`}>Area Subtotal</td>
                  <td className={`${tdR} font-semibold`}>{fmtHrs(sub.daily)}</td>
                  <td className={`${tdR} font-semibold`}>{fmtHrs(sub.weekly)}</td>
                  <td className={`${tdR} font-semibold`}>{fmtHrs(sub.monthly)}</td>
                  <td className={`${tdR} font-semibold`}>{fmtHrs(sub.yearly)}</td>
                </tr>
              </>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className={tfootTd}>Grand Total</td>
            <td className={tfootTdR}>{fmtHrs(grand.daily)}</td>
            <td className={tfootTdR}>{fmtHrs(grand.weekly)}</td>
            <td className={tfootTdR}>{fmtHrs(grand.monthly)}</td>
            <td className={tfootTdR}>{fmtHrs(grand.yearly)}</td>
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

  const byPosition = new Map<string, { yearly: number; monthly: number; weekly: number; daily: number }>()
  for (const task of allTasks) {
    const pos = task.positions?.position_name ?? 'Unassigned'
    const cur = byPosition.get(pos) ?? { yearly: 0, monthly: 0, weekly: 0, daily: 0 }
    byPosition.set(pos, {
      yearly:  cur.yearly  + (task.yearly_hrs  ?? 0),
      monthly: cur.monthly + (task.monthly_hrs ?? 0),
      weekly:  cur.weekly  + (task.weekly_hrs  ?? 0),
      daily:   cur.daily   + (task.daily_hrs   ?? 0),
    })
  }
  const rows = [...byPosition.entries()].sort((a, b) => b[1].yearly - a[1].yearly)

  void totalYearly

  return (
    <div className="report-section">
      <ReportHeader title="Work Load by Position" prospect={data.prospect} building={data.building} />
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className={th}>Position</th>
            <th className={thR}>Daily Hrs</th>
            <th className={thR}>Weekly Hrs</th>
            <th className={thR}>Monthly Hrs</th>
            <th className={thR}>Annual Hrs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([position, hrs]) => (
            <tr key={position}>
              <td className={`${td} font-medium`}>{position}</td>
              <td className={tdR}>{fmtHrs(hrs.daily)}</td>
              <td className={tdR}>{fmtHrs(hrs.weekly)}</td>
              <td className={tdR}>{fmtHrs(hrs.monthly)}</td>
              <td className={tdR}>{fmtHrs(hrs.yearly)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className={tfootTd}>Total</td>
            <td className={tfootTdR}>{fmtHrs(rows.reduce((s, [, h]) => s + h.daily,   0))}</td>
            <td className={tfootTdR}>{fmtHrs(rows.reduce((s, [, h]) => s + h.weekly,  0))}</td>
            <td className={tfootTdR}>{fmtHrs(rows.reduce((s, [, h]) => s + h.monthly, 0))}</td>
            <td className={tfootTdR}>{fmtHrs(rows.reduce((s, [, h]) => s + h.yearly,  0))}</td>
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
    bidLaborLines, bidLaborCosts, bidOtherCosts,
    bidSummary.margin_type, bidSummary.margin_value,
    building.square_feet,
    bidSummary.vacation_pct, bidSummary.vacation_hours_override,
    bidSummary.sick_hours_override, bidSummary.vacation_rate, bidSummary.sick_rate,
  )

  const profit = totals.sellingPrice - totals.totalCost
  const pieSegments: PieSegment[] = [
    { label: 'Total Labor',         value: totals.totalLabor,        color: '#2563eb' },
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
  const factorDisplay = (type: string, factor: number | null) =>
    factor == null ? '—' : type === 'percent_markup' ? `${factor}%` : fmt$(factor)

  const sectionHeader = (label: string) => (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3 mt-8 first:mt-0">
      {label}
    </h3>
  )

  return (
    <div className="report-section">
      <ReportHeader title="Investment Recap / Bidding Report" prospect={data.prospect} building={data.building} />

      {sectionHeader('Section 1 — Labor by Position')}
      <table className="w-full text-sm border-collapse mb-2">
        <thead>
          <tr>
            <th className={th}>Position</th>
            <th className={thR}>Annual Hours</th>
            <th className={thR}>Rate ($/hr)</th>
            <th className={thR}>Annual Cost</th>
          </tr>
        </thead>
        <tbody>
          {bidLaborLines.map(line => (
            <tr key={line.id}>
              <td className={td}>{line.positions?.position_name ?? '—'}</td>
              <td className={tdR}>{fmtHrs(line.annual_hours)}</td>
              <td className={tdR}>{fmt$(line.rate)}</td>
              <td className={tdR}>{fmt$(calcPositionCost(line.annual_hours, line.rate))}</td>
            </tr>
          ))}
          <tr className="bg-gray-50">
            <td className={`${td} pl-8 text-gray-500`}>Vacation</td>
            <td className={`${tdR} text-gray-500`}>{totals.vacationHours.toFixed(1)}</td>
            <td className={`${tdR} text-gray-500`}>{fmt$(bidSummary.vacation_rate)}</td>
            <td className={`${tdR} text-gray-500`}>{fmt$(totals.vacationCost)}</td>
          </tr>
          <tr className="bg-gray-50">
            <td className={`${td} pl-8 text-gray-500`}>Sick Time</td>
            <td className={`${tdR} text-gray-500`}>{totals.sickHours.toFixed(1)}</td>
            <td className={`${tdR} text-gray-500`}>{fmt$(bidSummary.sick_rate)}</td>
            <td className={`${tdR} text-gray-500`}>{fmt$(totals.sickCost)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td className={tfootTd}>Total Labor</td>
            <td className={tfootTdR}>{fmtHrs(bidLaborLines.reduce((s, l) => s + (l.annual_hours ?? 0), 0) + totals.vacationHours + totals.sickHours)}</td>
            <td className={tfootTdR}>—</td>
            <td className={tfootTdR}>{fmt$(totals.totalLabor)}</td>
          </tr>
        </tfoot>
      </table>

      {sectionHeader('Section 2 — Labor Related Costs')}
      <table className="w-full text-sm border-collapse mb-2">
        <thead>
          <tr>
            <th className={th}>Description</th>
            <th className={thR}>Type</th>
            <th className={thR}>Factor</th>
            <th className={thR}>Annual Cost</th>
          </tr>
        </thead>
        <tbody>
          {bidLaborCosts.map(cost => (
            <tr key={cost.id}>
              <td className={td}>{cost.description ?? '—'}</td>
              <td className={`${tdR} text-xs text-gray-500`}>{costTypeLabel(cost.type)}</td>
              <td className={tdR}>{factorDisplay(cost.type, cost.factor)}</td>
              <td className={tdR}>{fmt$(calcCostLine(cost.type, cost.factor, totals.totalLabor, totals.totalHours))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className={tfootTd}>Total Labor Related Costs</td>
            <td className={tfootTdR}>{fmt$(totals.totalLaborRelated)}</td>
          </tr>
        </tfoot>
      </table>

      {sectionHeader('Section 3 — Other Direct Costs')}
      <table className="w-full text-sm border-collapse mb-2">
        <thead>
          <tr>
            <th className={th}>Description</th>
            <th className={thR}>Type</th>
            <th className={thR}>Factor</th>
            <th className={thR}>Annual Cost</th>
          </tr>
        </thead>
        <tbody>
          {bidOtherCosts.map(cost => (
            <tr key={cost.id}>
              <td className={td}>{cost.description ?? '—'}</td>
              <td className={`${tdR} text-xs text-gray-500`}>{costTypeLabel(cost.type)}</td>
              <td className={tdR}>{factorDisplay(cost.type, cost.factor)}</td>
              <td className={tdR}>{fmt$(calcCostLine(cost.type, cost.factor, totals.totalLabor, totals.totalHours))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className={tfootTd}>Total Other Direct Costs</td>
            <td className={tfootTdR}>{fmt$(totals.totalOtherDirect)}</td>
          </tr>
        </tfoot>
      </table>

      {sectionHeader('Pricing Summary')}
      <div className="grid grid-cols-2 gap-8 items-start">

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Cost Breakdown</p>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-gray-100">
              {pieSegments.map(seg => (
                <tr key={seg.label}>
                  <td className="py-1.5 pr-4 text-gray-600 flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
                    {seg.label}
                  </td>
                  <td className="py-1.5 text-right tabular-nums font-medium text-gray-800">{fmt$(pieSegments.find(s => s.label === seg.label)?.value ?? 0)}</td>
                  <td className="py-1.5 pl-3 text-right tabular-nums text-gray-500">{seg.pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Pricing Summary</p>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-1.5 pr-4 text-gray-600">Total Cost</td>
                <td className="py-1.5 text-right tabular-nums font-medium">{fmt$(totals.totalCost)}</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4 text-gray-600">
                  {bidSummary.margin_type === 'percent'
                    ? `Gross Margin (${bidSummary.margin_value}%)`
                    : 'Fixed Fee'}
                </td>
                <td className="py-1.5 text-right tabular-nums font-medium">{fmt$(profit)}</td>
              </tr>
              <tr className="border-t-2 border-gray-800 font-bold text-gray-900">
                <td className="py-2 pr-4">Selling Price / Year</td>
                <td className="py-2 text-right tabular-nums text-sm">{fmt$(totals.sellingPrice)}</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4 text-gray-600">Price / Month</td>
                <td className="py-1.5 text-right tabular-nums font-medium">{fmt$(totals.pricePerMonth)}</td>
              </tr>
              {building.square_feet != null && (
                <>
                  <tr>
                    <td className="py-1.5 pr-4 text-gray-600">$/Sq Ft (Annual)</td>
                    <td className="py-1.5 text-right tabular-nums font-medium">
                      {totals.sqftAnnual != null ? `$${totals.sqftAnnual.toFixed(4)}` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4 text-gray-600">$/Sq Ft (Monthly)</td>
                    <td className="py-1.5 text-right tabular-nums font-medium">
                      {totals.sqftMonthly != null ? `$${totals.sqftMonthly.toFixed(4)}` : '—'}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Report 7: Pinpoint ───────────────────────────────────────────────────────

function PinpointReport({ data, logoUrl = null }: { data: ReportData; logoUrl?: string | null }) {
  const { building, prospect, areas, bidLaborLines } = data

  const ppTh  = 'border border-gray-300 px-3 py-2 text-left   text-xs font-semibold uppercase tracking-wide text-gray-600 bg-gray-50'
  const ppThR = 'border border-gray-300 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 bg-gray-50'
  const ppTd  = 'border border-gray-300 px-3 py-1 text-xs text-gray-700'
  const ppTdR = 'border border-gray-300 px-3 py-1 text-xs text-center tabular-nums text-gray-700'
  const ppFt  = 'border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-900 bg-gray-100'
  const ppFtR = 'border border-gray-300 px-3 py-2 text-xs font-semibold text-center tabular-nums text-gray-900 bg-gray-100'

  const fmtN = (n: number | null | undefined) =>
    n == null ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: 0 })

  const totalCarpet = areas.reduce((s, a) => s + (a.carpet_sqft   ?? 0), 0)
  const totalTile   = areas.reduce((s, a) => s + (a.tile_vct_sqft ?? 0), 0)
  const totalOther  = areas.reduce((s, a) => s + (a.other_sqft    ?? 0), 0)
  const totalFloor  = totalCarpet + totalTile + totalOther
  const pct = (n: number) => totalFloor > 0 ? `${((n / totalFloor) * 100).toFixed(1)}%` : '—'

  const serviceDays = building.service_days ?? 260
  const staffingRows = bidLaborLines.map(line => ({
    position: line.positions?.position_name ?? '—',
    annual:   line.annual_hours ?? 0,
    monthly:  (line.annual_hours ?? 0) / 12,
    weekly:   (line.annual_hours ?? 0) / 52,
    daily:    (line.annual_hours ?? 0) / serviceDays,
  }))

  // form cell classes for Page 1 building profile grid
  const pL = 'px-2 py-1.5 text-xs text-gray-600 align-top border-r border-b border-gray-200'
  const pV = 'px-2 py-1.5 text-xs text-center text-gray-900 border-b border-gray-200'

  // compact cell classes for the area grid (many columns — use xs sizing)
  const agTh  = 'border border-gray-300 px-2 py-1.5 text-left   text-xs font-semibold uppercase tracking-wide text-gray-600 bg-gray-50'
  const agThC = 'border border-gray-300 px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 bg-gray-50'
  const agTd  = 'border border-gray-300 px-2 py-1   text-xs text-gray-700'
  const agTdC = 'border border-gray-300 px-2 py-1   text-xs text-center tabular-nums text-gray-700'

  type GridRow = { label: string; getValue: (a: Area) => number | null | undefined; getTotal: () => number | null }
  // sum a field across all areas; returns null when no area has a non-null value (so the Totals cell shows "—", not 0)
  const sumCol = (get: (a: Area) => number | null | undefined): number | null => {
    let sum = 0, any = false
    for (const a of areas) { const v = get(a); if (v != null) { sum += v; any = true } }
    return any ? sum : null
  }
  // measurement columns, left→right, matching the AreaSpreadsheet header order
  const gridCols: GridRow[] = [
    { label: '# Rooms',      getValue: a => a.room_count,    getTotal: () => sumCol(a => a.room_count)    },
    { label: 'Carpet Sqft',  getValue: a => a.carpet_sqft,   getTotal: () => sumCol(a => a.carpet_sqft)   },
    { label: 'Tile Sqft',    getValue: a => a.tile_vct_sqft, getTotal: () => sumCol(a => a.tile_vct_sqft) },
    { label: 'RR Fix',       getValue: a => a.fixtures,      getTotal: () => sumCol(a => a.fixtures)      },
    { label: '# Showers',    getValue: a => a.showers,       getTotal: () => sumCol(a => a.showers)       },
    { label: '# Fountains',  getValue: a => a.fountains,     getTotal: () => sumCol(a => a.fountains)     },
    { label: '# Sinks',      getValue: a => a.sinks,         getTotal: () => sumCol(a => a.sinks)         },
    { label: '# Stairwells', getValue: a => a.stairwells,    getTotal: () => sumCol(a => a.stairwells)    },
    { label: 'Total Sqft',   getValue: a => a.square_footage,getTotal: () => sumCol(a => a.square_footage)},
  ]

  return (
    <>
      {/* ── Page 1: Building Profile ──────────────────────────────────────── */}
      <div className="report-section">
        <ReportHeader title="Building Profile" prospect={prospect} building={building} logoUrl={logoUrl} />

        <div className="flex gap-4 items-start">

          {/* Form grid — ~60% */}
          <div className="flex-[3] min-w-0">
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <colgroup>
                <col style={{ width: '30%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '28%' }} />
                <col style={{ width: '24%' }} />
              </colgroup>
              <tbody>
                <tr className="bg-gray-50">
                  <td className={pL}>Name of Building</td>
                  <td className={pV} colSpan={3}>{building.building_name || '—'}</td>
                </tr>
                <tr className="bg-gray-100">
                  <td className={pL}>Address</td>
                  <td className={pV} colSpan={3}>{[building.address, building.address_2].filter(Boolean).join(', ') || '—'}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className={pL}>City</td>
                  <td className={pV}>{building.city || '—'}</td>
                  <td className={pL}>State&ensp;/&ensp;Zip</td>
                  <td className={pV}>{[building.state, building.zip].filter(Boolean).join('  ') || '—'}</td>
                </tr>
                <tr className="bg-gray-100">
                  <td className={pL}>Total square footage</td>
                  <td className={pV}>{fmtN(building.square_feet)}</td>
                  <td className={pL}>Number of floors</td>
                  <td className={pV}>{building.floors != null ? String(building.floors) : '—'}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className={pL}>Common area square footage</td>
                  <td className={pV}>—</td>
                  <td className={pL}>Number of restrooms</td>
                  <td className={pV}>—</td>
                </tr>
                <tr className="bg-gray-100">
                  <td className={pL}>Cleanable Tenant Sq. Footage</td>
                  <td className={pV}>—</td>
                  <td className={pL}>Number of fixtures in RR&apos;s</td>
                  <td className={pV}>—</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className={pL}>Restroom Sqft</td>
                  <td className={pV}>—</td>
                  <td className={pL}>Number of toilets</td>
                  <td className={pV}>—</td>
                </tr>
                <tr className="bg-gray-100">
                  <td className={pL}>Number of stairwells</td>
                  <td className={pV}>—</td>
                  <td className={pL}>Number of urinals</td>
                  <td className={pV}>—</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className={pL}>Stair width / Stair length</td>
                  <td className={pV}>— / —</td>
                  <td className={pL}>Number of sinks</td>
                  <td className={pV}>—</td>
                </tr>
                <tr className="bg-gray-100">
                  <td className={pL}>Stair square feet or #</td>
                  <td className={pV}>—</td>
                  <td className={pL}>Number of fountains</td>
                  <td className={pV}>—</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className={pL}>Number of elevators</td>
                  <td className={pV}>—</td>
                  <td className={pL}>Elevator sq. footage</td>
                  <td className={pV}>—</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right column — Floor Surface Summary */}
          <div className="flex-[2] min-w-0">
            <div className="border border-gray-300">
              <div className="bg-gray-100 text-center py-1.5 text-xs font-bold uppercase tracking-widest text-gray-700 border-b border-gray-300">
                Floor Surface Summary
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-2 py-1.5 text-xs font-normal text-gray-600 text-left   border-b border-r border-gray-200 bg-gray-100">Surface</th>
                    <th className="px-2 py-1.5 text-xs font-normal text-gray-600 text-center border-b border-r border-gray-200 bg-gray-100">Sqft</th>
                    <th className="px-2 py-1.5 text-xs font-normal text-gray-600 text-center border-b           border-gray-200 bg-gray-100">%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-gray-50">
                    <td className={pL}>Carpet</td>
                    <td className={pV}>{fmtN(totalCarpet)}</td>
                    <td className={pV}>{pct(totalCarpet)}</td>
                  </tr>
                  <tr className="bg-gray-100">
                    <td className={pL}>Tile / VCT</td>
                    <td className={pV}>{fmtN(totalTile)}</td>
                    <td className={pV}>{pct(totalTile)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className={pL}>Other</td>
                    <td className={pV}>{fmtN(totalOther)}</td>
                    <td className={pV}>{pct(totalOther)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td className="px-2 py-1.5 text-xs font-semibold text-gray-900 border-r border-b border-gray-200 bg-gray-200">Total</td>
                    <td className="px-2 py-1.5 text-xs text-center font-semibold text-gray-900 border-b border-gray-200 bg-gray-200">{fmtN(totalFloor)}</td>
                    <td className="px-2 py-1.5 text-xs text-center font-semibold text-gray-900 border-b border-gray-200 bg-gray-200">{totalFloor > 0 ? '100%' : '—'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ── Page 2: Area Grid ─────────────────────────────────────────────── */}
      <div className="report-section pinpoint-landscape">
        <ReportHeader title="Pinpoint — Area Grid" prospect={prospect} building={building} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${agTh} w-36`}>Area</th>
                {gridCols.map(col => (
                  <th key={col.label} className={`${agThC} whitespace-nowrap`}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {areas.map(a => (
                <tr key={a.id}>
                  <td className={agTd}>{a.area_name}</td>
                  {gridCols.map(col => (
                    <td key={col.label} className={agTdC}>{fmtN(col.getValue(a))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className={`${agTd} bg-gray-50 font-semibold`}>Totals</td>
                {gridCols.map(col => (
                  <td key={col.label} className={`${agTdC} bg-gray-50 font-semibold`}>{fmtN(col.getTotal())}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Page 3: Production & Staffing Summary ─────────────────────────── */}
      <div className="report-section">
        <ReportHeader title="Pinpoint — Production & Staffing Summary" prospect={prospect} building={building} />
        {staffingRows.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No staffing data available for this building.</p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className={ppTh}>Position</th>
                <th className={ppThR}>Annual Hrs</th>
                <th className={ppThR}>Monthly Hrs</th>
                <th className={ppThR}>Weekly Hrs</th>
                <th className={ppThR}>Daily Hrs</th>
              </tr>
            </thead>
            <tbody>
              {staffingRows.map((row, i) => (
                <tr key={i}>
                  <td className={ppTd}>{row.position}</td>
                  <td className={ppTdR}>{fmtHrs(row.annual)}</td>
                  <td className={ppTdR}>{fmtHrs(row.monthly)}</td>
                  <td className={ppTdR}>{fmtHrs(row.weekly)}</td>
                  <td className={ppTdR}>{fmtHrs(row.daily)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className={ppFt}>Total</td>
                <td className={ppFtR}>{fmtHrs(staffingRows.reduce((s, r) => s + r.annual,  0))}</td>
                <td className={ppFtR}>{fmtHrs(staffingRows.reduce((s, r) => s + r.monthly, 0))}</td>
                <td className={ppFtR}>{fmtHrs(staffingRows.reduce((s, r) => s + r.weekly,  0))}</td>
                <td className={ppFtR}>{fmtHrs(staffingRows.reduce((s, r) => s + r.daily,   0))}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ReportsView({
  prospect,
  building,
  companySettings,
}: {
  prospect: Prospect
  building: Building
  companySettings: CompanySettings | null
}) {
  const [checked, setChecked]               = useState<Set<string>>(new Set())
  const [includeLogo, setIncludeLogo]       = useState(true)
  const [reportData, setReportData]         = useState<ReportData | null>(null)
  const [isGenerating, setIsGenerating]     = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  function toggleReport(key: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(key)) { next.delete(key) } else { next.add(key) }
      return next
    })
  }

  async function handleGenerate() {
    if (checked.size === 0) return
    setIsGenerating(true)
    setError(null)

    try {
      const [
        { data: areas, error: areasErr },
        { data: bidSummary },
        { data: bidLaborLines },
        { data: bidLaborCosts },
        { data: bidOtherCosts },
      ] = await Promise.all([
        supabase
          .from('areas')
          .select('*, task_line_items(*, task_codes(task_code, task_name, description, description_alt), positions(position_name))')
          .eq('building_id', building.id)
          .order('print_order', { nullsFirst: false })
          .order('created_at'),
        supabase.from('bid_summary').select('*').eq('building_id', building.id).maybeSingle(),
        supabase.from('bid_labor_lines').select('*, positions(position_name)').eq('building_id', building.id).order('sort_order', { nullsFirst: false }).order('created_at'),
        supabase.from('bid_labor_costs').select('*').eq('building_id', building.id).order('sort_order', { nullsFirst: false }).order('created_at'),
        supabase.from('bid_other_costs').select('*').eq('building_id', building.id).order('sort_order', { nullsFirst: false }).order('created_at'),
      ])

      if (areasErr) throw areasErr

      const sortedAreas: Area[] = ((areas ?? []) as Area[]).map(a => ({
        ...a,
        task_line_items: [...a.task_line_items].sort((x, y) =>
          new Date(x.created_at).getTime() - new Date(y.created_at).getTime()
        ),
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

  const canGenerate = checked.size > 0
  const hasContentReports = [...checked].some(k => k !== 'cover_page')

  return (
    <>
      <style>{`
        .report-section { font-family: Tahoma, Verdana, Geneva, sans-serif; }
        @media print {
          .cover-page  { break-after: page; height: 100vh !important; min-height: unset !important; }
          .report-section { break-before: page; }
          .report-section:first-child { break-before: auto; }
          .pinpoint-landscape { page: pinpoint-landscape; }
        }
        @page pinpoint-landscape {
          size: landscape;
        }
      `}</style>

      <div className="flex h-full overflow-hidden">

        {/* ── Controls sidebar ──────────────────────────────── */}
        <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto flex flex-col gap-5 p-5 print:hidden">

          {/* Back to search */}
          <Link
            href="/reports"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium -mb-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Search
          </Link>

          {/* Selected prospect / building */}
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-gray-900">{prospect.company_name}</p>
            <p className="text-sm text-gray-500">{building.building_name}</p>
          </div>

          {/* Report selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Reports</span>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setChecked(new Set(REPORT_OPTIONS.map(r => r.key)))}
                  className="text-brand-600 hover:text-brand-800">All</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => setChecked(new Set())}
                  className="text-gray-500 hover:text-gray-700">None</button>
              </div>
            </div>

            <p className="text-xs text-gray-400 font-medium mb-0.5">Document</p>
            {DOCUMENT_REPORTS.map(r => (
              <label key={r.key} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer">
                <input type="checkbox" checked={checked.has(r.key)} onChange={() => toggleReport(r.key)} className="mt-0.5 accent-brand-600" />
                <span className="text-sm text-gray-700 leading-snug">{r.label}</span>
              </label>
            ))}

            <p className="text-xs text-gray-400 font-medium mt-2 mb-0.5">Workload</p>
            {WORKLOAD_REPORTS.map(r => (
              <label key={r.key} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer">
                <input type="checkbox" checked={checked.has(r.key)} onChange={() => toggleReport(r.key)} className="mt-0.5 accent-brand-600" />
                <span className="text-sm text-gray-700 leading-snug">{r.label}</span>
              </label>
            ))}

            <p className="text-xs text-gray-400 font-medium mt-2 mb-0.5">Bidding</p>
            {BIDDING_REPORTS.map(r => (
              <label key={r.key} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer">
                <input type="checkbox" checked={checked.has(r.key)} onChange={() => toggleReport(r.key)} className="mt-0.5 accent-brand-600" />
                <span className="text-sm text-gray-700 leading-snug">{r.label}</span>
              </label>
            ))}
          </div>

          {/* Options */}
          {companySettings?.logo_url && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Options</p>
              {companySettings?.logo_url && (
                <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer">
                  <input type="checkbox" checked={includeLogo} onChange={e => setIncludeLogo(e.target.checked)} className="accent-brand-600" />
                  <span className="text-sm text-gray-700">Include logo</span>
                </label>
              )}
            </div>
          )}

          {/* Company settings notice */}
          {!companySettings?.company_name && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Add company info in <span className="font-medium">Admin &rsaquo; Company Settings</span> to include it on reports.
            </div>
          )}

          {/* Generate */}
          <div className="mt-auto pt-4 border-t border-gray-200 space-y-2">
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating || !hasContentReports}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              {isGenerating ? 'Generating…' : 'Generate Reports'}
            </button>
          </div>
        </div>

        {/* ── Report output ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-gray-100 print:bg-white">
          {!reportData ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-3 print:hidden">
              <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="font-medium text-gray-500">No report generated yet</p>
              <p className="text-sm text-gray-400">
                Select at least one report then click Generate
              </p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm print:hidden">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{reportData.prospect.company_name}</span>
                  <span className="mx-2 text-gray-300">·</span>
                  {reportData.building.building_name}
                  <span className="mx-2 text-gray-300">·</span>
                  <span className="text-gray-400">{[...checked].filter(k => k !== 'cover_page').length} report{[...checked].filter(k => k !== 'cover_page').length !== 1 ? 's' : ''}</span>
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

              {/* Pages */}
              <div className="py-8 px-6 space-y-6 print:p-0 print:space-y-0" style={{ fontFamily: 'Tahoma, Verdana, Geneva, sans-serif' }}>

                {checked.has('cover_page') && (
                  <div className="bg-white shadow-sm rounded-sm mx-auto print:shadow-none print:rounded-none" style={{ maxWidth: '816px' }}>
                    <div className="px-16 py-12">
                      <CoverPage data={reportData} company={companySettings} includeLogo={includeLogo} />
                    </div>
                  </div>
                )}

                {[
                  checked.has('pinpoint') && (
                    <PinpointReport key="pinpoint" data={reportData} logoUrl={includeLogo ? (companySettings?.logo_url ?? null) : null} />
                  ),
                  checked.has('scope_no_codes') && (
                    <ScopeOfWorkReport key="scope_no" data={reportData} withTaskCodes={false} logoUrl={includeLogo ? (companySettings?.logo_url ?? null) : null} />
                  ),
                  checked.has('scope_with_codes') && (
                    <ScopeOfWorkReport key="scope_codes" data={reportData} withTaskCodes={true} logoUrl={includeLogo ? (companySettings?.logo_url ?? null) : null} />
                  ),
                  checked.has('scope_no_codes_es') && (
                    <ScopeOfWorkReport key="scope_es" data={reportData} withTaskCodes={false} useAltDescription logoUrl={includeLogo ? (companySettings?.logo_url ?? null) : null} />
                  ),
                  checked.has('wl_summary') && (
                    <WorkLoadSummaryReport key="wl_sum" data={reportData} />
                  ),
                  checked.has('wl_detail') && (
                    <WorkLoadDetailReport key="wl_det" data={reportData} />
                  ),
                  checked.has('wl_by_position') && (
                    <WorkLoadByPositionReport key="wl_pos" data={reportData} />
                  ),
                  checked.has('investment_recap') && (
                    <InvestmentRecapReport key="inv" data={reportData} />
                  ),
                ].filter(Boolean).map((el, i) => (
                  <div key={i} className="bg-white shadow-sm rounded-sm mx-auto print:shadow-none print:rounded-none" style={{ maxWidth: '816px' }}>
                    <div className="px-12 py-10">
                      {el}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
