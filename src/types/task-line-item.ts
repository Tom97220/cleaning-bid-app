export interface TaskLineItem {
  id:           string
  area_id:      string
  task_code_id: string | null
  task_name:    string
  position_id:  string | null
  frequency:    number | null
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
  task_codes: { task_code: string } | null
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
