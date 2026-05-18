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

export interface CompanySettings {
  id: string
  company_name: string | null
  address_1: string | null
  address_2: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
}

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
  { key: 'scope_no_codes',   label: 'Scope of Work (without task codes)',   category: 'Workload', isScope: true  },
  { key: 'scope_with_codes', label: 'Scope of Work (with task codes)',      category: 'Workload', isScope: true  },
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

const fmtFreq = (freq: number | null): string => {
  if (!freq) return '—'
  const map: Record<number, string> = {
    365: 'Daily',          260: 'Daily',
    156: '3x/week',        104: '2x/week',
    52:  'Weekly',         26:  'Bi-weekly',
    24:  '2x/month',       12:  'Monthly',
    6:   'Every 2 months', 4:   'Quarterly',
    2:   'Semi-annually',  1:   'Annually',
  }
  return map[freq] ?? `${freq}x/year`
}

function todayStr() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function companyAddressLines(c: CompanySettings): string[] {
  const lines: string[] = []
  if (c.address_1) lines.push(c.address_1)
  if (c.address_2) lines.push(c.address_2)
  const cityLine = [c.city, c.state, c.zip].filter(Boolean).join(', ')
  if (cityLine) lines.push(cityLine)
  if (c.phone) lines.push(c.phone)
  if (c.email) lines.push(c.email)
  return lines
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
  company,
}: {
  title: string
  prospect: Prospect
  building: Building
  company: CompanySettings | null
}) {
  return (
    <div className="mb-8">
      {/* Date + company name row */}
      <div className="flex justify-between items-baseline mb-3">
        <span className="text-sm text-gray-500">{todayStr()}</span>
        {company?.company_name && (
          <span className="text-sm font-medium text-gray-600">{company.company_name}</span>
        )}
      </div>

      {/* Double-line separator */}
      <div className="border-t-2 border-gray-800 mb-0.5" />
      <div className="border-t border-gray-800 mb-7" />

      {/* Centered title block */}
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

      {/* Thin rule below header block */}
      <div className="mt-6 border-t border-gray-300" />
    </div>
  )
}

// ─── Cover Page ───────────────────────────────────────────────────────────────

function CoverPage({
  data,
  company,
}: {
  data: ReportData
  company: CompanySettings | null
}) {
  return (
    <div
      className="cover-page relative flex flex-col bg-white"
      style={{ minHeight: '1050px' }}
    >
      {/* Top: logo + company name */}
      <div className="text-center pt-16 px-16">
        {company?.logo_url && (
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

      {/* Middle: centered document title + building */}
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

      {/* Bottom: presented by */}
      <div className="text-center pb-16 px-16">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">Presented by</p>
        {company ? (
          <div className="space-y-0.5">
            {company.company_name && (
              <p className="font-semibold text-gray-800">{company.company_name}</p>
            )}
            {companyAddressLines(company).map((line, i) => (
              <p key={i} className="text-sm text-gray-600">{line}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            Add company details in Admin &rsaquo; Company Settings
          </p>
        )}
        <p className="text-xs text-gray-400 mt-5">{todayStr()}</p>
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
  data, withTaskCodes, includeAltLang, company,
}: {
  data: ReportData; withTaskCodes: boolean; includeAltLang: boolean; company: CompanySettings | null
}) {
  const title = withTaskCodes
    ? 'Work Load Specifications / Scope of Work (with Task Codes)'
    : 'Work Load Specifications / Scope of Work'

  const printAreas = data.areas
    .map(area => ({ ...area, task_line_items: area.task_line_items.filter(t => t.print) }))
    .filter(area => area.task_line_items.length > 0)

  // colCount: Task Code? + Task Name (codes only) + Description + Alt Lang? + Service Days
  const colCount = (withTaskCodes ? 2 : 1) + (includeAltLang ? 1 : 0) + 1

  return (
    <div className="report-section">
      <ReportHeader title={title} prospect={data.prospect} building={data.building} company={company} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {withTaskCodes && (
              <>
                <th className="text-left font-bold text-gray-900 pb-2.5 pr-6 border-b-2 border-gray-800 w-24 whitespace-nowrap">
                  Task Code
                </th>
                <th className="text-left font-bold text-gray-900 pb-2.5 pr-6 border-b-2 border-gray-800 w-40 whitespace-nowrap">
                  Task Name
                </th>
              </>
            )}
            <th className="text-left font-bold text-gray-900 pb-2.5 border-b-2 border-gray-800">
              Description
            </th>
            {includeAltLang && (
              <th className="text-left font-bold text-gray-900 pb-2.5 pl-6 border-b-2 border-gray-800 w-48">
                Alternate Language
              </th>
            )}
            <th className="text-right font-bold text-gray-900 pb-2.5 pl-8 border-b-2 border-gray-800 w-32 whitespace-nowrap">
              Service Days
            </th>
          </tr>
        </thead>
        <tbody>
          {printAreas.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="py-8 text-center text-gray-400 italic text-sm">
                No printable tasks found for this building
              </td>
            </tr>
          ) : (
            printAreas.map(area => (
              <>
                {/* Area header row */}
                <tr key={`area-${area.id}`}>
                  <td
                    colSpan={colCount}
                    className="pt-5 pb-1 pl-0.5 text-sm font-bold italic text-gray-800"
                  >
                    Area: {area.area_name}
                  </td>
                </tr>

                {/* Task rows */}
                {area.task_line_items.map(task => (
                  <tr key={task.id}>
                    {withTaskCodes && (
                      <>
                        <td className="py-1 pr-6 align-top whitespace-nowrap">
                          <span className="font-mono text-xs text-gray-500">
                            {task.task_codes?.task_code ?? ''}
                          </span>
                        </td>
                        <td className="py-1 pr-6 align-top text-gray-800">
                          {task.task_name ?? '—'}
                        </td>
                      </>
                    )}
                    <td className="py-1 pr-8 align-top">
                      {withTaskCodes ? (
                        <span className="text-gray-700">{task.task_codes?.description ?? ''}</span>
                      ) : (
                        <>
                          <div className="text-gray-800 leading-snug">{task.task_name ?? '—'}</div>
                          {task.task_codes?.description && (
                            <div className="text-xs text-gray-500 mt-0.5 leading-snug">
                              {task.task_codes.description}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    {includeAltLang && (
                      <td className="py-1 pl-6 pr-8 align-top text-gray-500 italic">
                        {task.task_codes?.description_alt ?? ''}
                      </td>
                    )}
                    <td className="py-1 pl-8 text-right align-top whitespace-nowrap text-sm text-gray-600">
                      {fmtFreq(task.frequency)}
                    </td>
                  </tr>
                ))}
              </>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Report 3: Work Load Development Summary ──────────────────────────────────

function WorkLoadSummaryReport({ data, company }: { data: ReportData; company: CompanySettings | null }) {
  const allTasks    = data.areas.flatMap(a => a.task_line_items)
  const annualHours = allTasks.reduce((s, t) => s + (t.yearly_hrs ?? 0), 0)

  const freqs    = data.areas.map(a => a.frequency).filter((f): f is number => f != null)
  const siteFreq = freqs.length > 0
    ? freqs.sort((a, b) => freqs.filter(f => f === b).length - freqs.filter(f => f === a).length)[0]
    : 260
  const staff = siteFreq > 0 ? annualHours / 8 / siteFreq : 0

  const rows = [
    { label: 'Total Annual Hours',    value: `${fmtHrs(annualHours)} hrs` },
    { label: 'Monthly Average Hours', value: `${fmtHrs(annualHours / 12)} hrs` },
    { label: 'Weekly Average Hours',  value: `${fmtHrs(annualHours / 52)} hrs` },
    { label: 'Daily Average Hours',   value: `${fmtHrs(annualHours / 260)} hrs` },
    { label: 'Total Staff Required',  value: staff.toFixed(2) },
  ]

  return (
    <div className="report-section">
      <ReportHeader title="Work Load Development Summary" prospect={data.prospect} building={data.building} company={company} />
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
        <p className="mt-5 text-xs text-gray-400">
          Staff Required = Annual Hours ÷ 8 hrs/shift ÷ {siteFreq} visits/year
        </p>
      </div>
    </div>
  )
}

// ─── Report 4: Work Load Development Detail ───────────────────────────────────

function WorkLoadDetailReport({ data, company }: { data: ReportData; company: CompanySettings | null }) {
  const allTasks = data.areas.flatMap(a => a.task_line_items)
  const grand = {
    yearly:  allTasks.reduce((s, t) => s + (t.yearly_hrs  ?? 0), 0),
    monthly: allTasks.reduce((s, t) => s + (t.monthly_hrs ?? 0), 0),
    weekly:  allTasks.reduce((s, t) => s + (t.weekly_hrs  ?? 0), 0),
    daily:   allTasks.reduce((s, t) => s + (t.daily_hrs   ?? 0), 0),
  }

  return (
    <div className="report-section">
      <ReportHeader title="Work Load Development Detail" prospect={data.prospect} building={data.building} company={company} />
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className={th}>Area / Task</th>
            <th className={thR}>Annual Hrs</th>
            <th className={thR}>Monthly Hrs</th>
            <th className={thR}>Weekly Hrs</th>
            <th className={thR}>Daily Hrs</th>
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
                    <td className={tdR}>{fmtHrs(task.yearly_hrs)}</td>
                    <td className={tdR}>{fmtHrs(task.monthly_hrs)}</td>
                    <td className={tdR}>{fmtHrs(task.weekly_hrs)}</td>
                    <td className={tdR}>{fmtHrs(task.daily_hrs)}</td>
                  </tr>
                ))}
                <tr key={`s-${area.id}`}>
                  <td className={`${td} pl-7 italic text-xs text-gray-400`}>Area Subtotal</td>
                  <td className={`${tdR} font-semibold`}>{fmtHrs(sub.yearly)}</td>
                  <td className={`${tdR} font-semibold`}>{fmtHrs(sub.monthly)}</td>
                  <td className={`${tdR} font-semibold`}>{fmtHrs(sub.weekly)}</td>
                  <td className={`${tdR} font-semibold`}>{fmtHrs(sub.daily)}</td>
                </tr>
              </>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className={tfootTd}>Grand Total</td>
            <td className={tfootTdR}>{fmtHrs(grand.yearly)}</td>
            <td className={tfootTdR}>{fmtHrs(grand.monthly)}</td>
            <td className={tfootTdR}>{fmtHrs(grand.weekly)}</td>
            <td className={tfootTdR}>{fmtHrs(grand.daily)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── Report 5: Work Load by Position ─────────────────────────────────────────

function WorkLoadByPositionReport({ data, company }: { data: ReportData; company: CompanySettings | null }) {
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
      <ReportHeader title="Work Load by Position" prospect={data.prospect} building={data.building} company={company} />
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className={th}>Position</th>
            <th className={thR}>Annual Hours</th>
            <th className={thR}>Monthly Hours</th>
            <th className={thR}>Weekly Hours</th>
            <th className={thR}>% of Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([position, hrs]) => (
            <tr key={position}>
              <td className={`${td} font-medium`}>{position}</td>
              <td className={tdR}>{fmtHrs(hrs.yearly)}</td>
              <td className={tdR}>{fmtHrs(hrs.monthly)}</td>
              <td className={tdR}>{fmtHrs(hrs.weekly)}</td>
              <td className={tdR}>
                {totalYearly > 0 ? `${((hrs.yearly / totalYearly) * 100).toFixed(1)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className={tfootTd}>Total</td>
            <td className={tfootTdR}>{fmtHrs(rows.reduce((s, [, h]) => s + h.yearly,  0))}</td>
            <td className={tfootTdR}>{fmtHrs(rows.reduce((s, [, h]) => s + h.monthly, 0))}</td>
            <td className={tfootTdR}>{fmtHrs(rows.reduce((s, [, h]) => s + h.weekly,  0))}</td>
            <td className={tfootTdR}>100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── Report 6: Investment Recap ───────────────────────────────────────────────

function InvestmentRecapReport({ data, company }: { data: ReportData; company: CompanySettings | null }) {
  const { bidSummary, bidLaborLines, bidLaborCosts, bidOtherCosts, building } = data

  if (!bidSummary) {
    return (
      <div className="report-section">
        <ReportHeader title="Investment Recap / Bidding Report" prospect={data.prospect} building={data.building} company={company} />
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
      <ReportHeader title="Investment Recap / Bidding Report" prospect={data.prospect} building={data.building} company={company} />

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
            <td colSpan={3} className={`${td} italic text-xs text-gray-500`}>
              Vacation ({bidSummary.vacation_pct}% / {totals.vacationHours.toFixed(1)} hrs @ {fmt$(bidSummary.vacation_rate)}/hr)
            </td>
            <td className={`${tdR} font-medium`}>{fmt$(totals.vacationCost)}</td>
          </tr>
          <tr className="bg-gray-50">
            <td colSpan={3} className={`${td} italic text-xs text-gray-500`}>
              Sick Time ({totals.sickHours.toFixed(1)} hrs @ {fmt$(bidSummary.sick_rate)}/hr)
            </td>
            <td className={`${tdR} font-medium`}>{fmt$(totals.sickCost)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className={tfootTd}>Total Labor</td>
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
      <div className="flex flex-wrap gap-12 items-start">
        <table className="text-sm">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-2 pr-10 text-gray-600">Total Cost</td>
              <td className="py-2 text-right tabular-nums font-medium">{fmt$(totals.totalCost)}</td>
            </tr>
            <tr>
              <td className="py-2 pr-10 text-gray-600">
                {bidSummary.margin_type === 'percent'
                  ? `Gross Margin (${bidSummary.margin_value}%)`
                  : 'Fixed Fee'}
              </td>
              <td className="py-2 text-right tabular-nums font-medium">{fmt$(profit)}</td>
            </tr>
            <tr className="border-t-2 border-gray-800 font-bold text-gray-900">
              <td className="py-2.5 pr-10">Selling Price / Year</td>
              <td className="py-2.5 text-right tabular-nums text-lg">{fmt$(totals.sellingPrice)}</td>
            </tr>
            <tr>
              <td className="py-2 pr-10 text-gray-600">Price / Month</td>
              <td className="py-2 text-right tabular-nums font-medium">{fmt$(totals.pricePerMonth)}</td>
            </tr>
            {building.square_feet != null && (
              <>
                <tr>
                  <td className="py-2 pr-10 text-gray-600">$/Sq Ft (Annual)</td>
                  <td className="py-2 text-right tabular-nums font-medium">
                    {totals.sqftAnnual != null ? `$${totals.sqftAnnual.toFixed(4)}` : '—'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-10 text-gray-600">$/Sq Ft (Monthly)</td>
                  <td className="py-2 text-right tabular-nums font-medium">
                    {totals.sqftMonthly != null ? `$${totals.sqftMonthly.toFixed(4)}` : '—'}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Cost Breakdown</p>
          <PieChart segments={pieSegments} />
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ReportsView({
  prospects,
  companySettings,
}: {
  prospects: Prospect[]
  companySettings: CompanySettings | null
}) {
  const [selectedProspectId, setSelectedProspectId] = useState('')
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [buildings, setBuildings]   = useState<Building[]>([])
  const [checked, setChecked]       = useState<Set<string>>(new Set())
  const [includeAltLang, setIncludeAltLang] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError]           = useState<string | null>(null)

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

  useEffect(() => { setReportData(null) }, [selectedBuildingId])

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
          .select('*, task_line_items(*, task_codes(task_code, task_name, description, description_alt), positions(position_name))')
          .eq('building_id', selectedBuildingId)
          .order('print_order', { nullsFirst: false })
          .order('created_at'),
        supabase.from('bid_summary').select('*').eq('building_id', selectedBuildingId).maybeSingle(),
        supabase.from('bid_labor_lines').select('*, positions(position_name)').eq('building_id', selectedBuildingId).order('sort_order', { nullsFirst: false }).order('created_at'),
        supabase.from('bid_labor_costs').select('*').eq('building_id', selectedBuildingId).order('sort_order', { nullsFirst: false }).order('created_at'),
        supabase.from('bid_other_costs').select('*').eq('building_id', selectedBuildingId).order('sort_order', { nullsFirst: false }).order('created_at'),
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

  const canGenerate = !!selectedProspectId && !!selectedBuildingId && checked.size > 0
  const anyScope    = checked.has('scope_no_codes') || checked.has('scope_with_codes')

  // Content-only reports (exclude cover_page from "no reports" check when it's the only one)
  const hasContentReports = [...checked].some(k => k !== 'cover_page')

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .cover-page  { break-after: page; height: 100vh !important; min-height: unset !important; }
          .report-section { break-before: page; }
          .report-section:first-child { break-before: auto; }
        }
      `}</style>

      <div className="flex h-full overflow-hidden">

        {/* ── Controls sidebar ──────────────────────────────── */}
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
              {prospects.map(p => <option key={p.id} value={p.id}>{p.company_name}</option>)}
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
              {buildings.map(b => <option key={b.id} value={b.id}>{b.building_name}</option>)}
            </select>
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

          {/* Alternate language option */}
          {anyScope && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Options</p>
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer">
                <input type="checkbox" checked={includeAltLang} onChange={e => setIncludeAltLang(e.target.checked)} className="accent-brand-600" />
                <span className="text-sm text-gray-700">Include alternate language column</span>
              </label>
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
                Select a prospect, building, and at least one report, then click Generate
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

              {/* Pages — each wrapped in a white A4-ish card on screen */}
              <div className="py-8 px-6 space-y-6 print:p-0 print:space-y-0">

                {checked.has('cover_page') && (
                  <div className="bg-white shadow-sm rounded-sm mx-auto print:shadow-none print:rounded-none" style={{ maxWidth: '816px' }}>
                    <div className="px-16 py-12">
                      <CoverPage data={reportData} company={companySettings} />
                    </div>
                  </div>
                )}

                {[
                  checked.has('scope_no_codes') && (
                    <ScopeOfWorkReport key="scope_no" data={reportData} withTaskCodes={false} includeAltLang={includeAltLang} company={companySettings} />
                  ),
                  checked.has('scope_with_codes') && (
                    <ScopeOfWorkReport key="scope_codes" data={reportData} withTaskCodes={true} includeAltLang={includeAltLang} company={companySettings} />
                  ),
                  checked.has('wl_summary') && (
                    <WorkLoadSummaryReport key="wl_sum" data={reportData} company={companySettings} />
                  ),
                  checked.has('wl_detail') && (
                    <WorkLoadDetailReport key="wl_det" data={reportData} company={companySettings} />
                  ),
                  checked.has('wl_by_position') && (
                    <WorkLoadByPositionReport key="wl_pos" data={reportData} company={companySettings} />
                  ),
                  checked.has('investment_recap') && (
                    <InvestmentRecapReport key="inv" data={reportData} company={companySettings} />
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
