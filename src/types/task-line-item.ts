import type { Area } from './area'

export interface TaskLineItem {
  id:           string
  area_id:      string
  task_code_id: string | null
  task_name:    string
  position_id:  string | null
  frequency:    number | null
  frequency_source: 'inherited' | 'override'
  percent:      number
  quantity:     number | null
  minutes:      number | null
  print:        boolean
  measure:      string | null
  type:         string | null
  yearly_hrs:   number | null
  weekly_hrs:   number | null
  daily_hrs:    number | null
  monthly_hrs:  number | null
  created_at:   string
  updated_at:   string
}

export interface TaskLineItemRow extends TaskLineItem {
  task_codes: { task_code: string; description: string | null } | null
  positions:  { position_name: string } | null
}

export interface TaskCodeForForm {
  id:              string
  task_code:       string
  task_name:       string
  position_id:     string | null
  unit_of_measure: string
  production_rate: number | null
  rate_each:       number | null
  default_basis:   string | null
  description:     string | null
  task_types:      { type_name: string } | null
}

export function calculateHours(
  measure: string | null,
  quantity: number | null,
  minutes: number | null,
  frequency: number | null,
  percent: number,
): {
  yearly_hrs:  number | null
  weekly_hrs:  number | null
  daily_hrs:   number | null
  monthly_hrs: number | null
} {
  if (!quantity || !frequency || !minutes) {
    return { yearly_hrs: null, weekly_hrs: null, daily_hrs: null, monthly_hrs: null }
  }
  const eff  = quantity * (percent / 100)
  const yHrs = measure === 'sqft_per_hour'
    ? (eff / minutes) * frequency
    : (eff * minutes / 60) * frequency
  const r    = (n: number) => Math.round(n * 10000) / 10000
  return {
    yearly_hrs:  r(yHrs),
    weekly_hrs:  r(yHrs / 52),
    daily_hrs:   r(yHrs / frequency),
    monthly_hrs: r(yHrs / 12),
  }
}

// ── Effective-frequency resolvers ───────────────────────────────────────────
// Walk the three-level inherit/override chain
//   building.service_days → area.frequency → task_line_item.frequency
// so every consumer (cascade, defaults, display) resolves the same way instead
// of ad-hoc value fallbacks. Both always return a usable number.
//
// Null-override fall-through: if a row's source is 'override' but its stored
// frequency is null (a blank/corrupt override), we fall through to the parent's
// effective value rather than returning null — so a bad override degrades to
// inheritance instead of leaking a null frequency downstream.

// An inherited area follows the building's service_days, regardless of whatever
// integer happens to sit in area.frequency.
export function resolveAreaEffectiveFrequency(
  area: Pick<Area, 'frequency' | 'frequency_source'>,
  buildingServiceDays: number,
): number {
  if (area.frequency_source === 'override' && area.frequency != null) {
    return area.frequency
  }
  return buildingServiceDays
}

// An inherited task follows its area's effective frequency, which itself
// resolves through the area's marker to either the area override or the
// building's service_days.
export function resolveTaskEffectiveFrequency(
  task: Pick<TaskLineItem, 'frequency' | 'frequency_source'>,
  area: Pick<Area, 'frequency' | 'frequency_source'>,
  buildingServiceDays: number,
): number {
  if (task.frequency_source === 'override' && task.frequency != null) {
    return task.frequency
  }
  return resolveAreaEffectiveFrequency(area, buildingServiceDays)
}
