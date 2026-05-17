export type CostType = 'percent_markup' | 'per_hour' | 'per_year'

export const COST_TYPE_LABELS: Record<CostType, string> = {
  percent_markup: '% of Labor',
  per_hour:       'Per Hour',
  per_year:       'Per Year',
}

export interface BidSummary {
  id:                string
  building_id:       string
  overhead_pct:      number
  profit_markup_pct: number
  created_at:        string
  updated_at:        string
}

export interface BidLaborLine {
  id:           string
  building_id:  string
  position_id:  string | null
  annual_hours: number | null
  vacation_pct: number
  sick_hours:   number | null
  rate:         number | null
  annual_cost:  number | null
  sort_order:   number | null
  created_at:   string
  updated_at:   string
}

export interface BidLaborLineRow extends BidLaborLine {
  positions: { position_name: string } | null
}

export interface BidLaborCost {
  id:          string
  building_id: string
  description: string | null
  type:        CostType
  factor:      number | null
  annual_cost: number | null
  sort_order:  number | null
  created_at:  string
  updated_at:  string
}

export interface BidOtherCost {
  id:          string
  building_id: string
  description: string | null
  type:        CostType
  factor:      number | null
  annual_cost: number | null
  sort_order:  number | null
  created_at:  string
  updated_at:  string
}

export function calcLaborLineCost(
  annual_hours: number | null,
  vacation_pct: number,
  sick_hours: number | null,
  rate: number | null,
): number {
  if (!annual_hours || !rate) return 0
  const sick = sick_hours ?? annual_hours / 30
  return (annual_hours + sick + annual_hours * vacation_pct / 100) * rate
}

export function calcCostLine(
  type: CostType | string,
  factor: number | null,
  totalLabor: number,
  totalHours: number,
): number {
  if (!factor) return 0
  switch (type) {
    case 'percent_markup': return totalLabor * factor / 100
    case 'per_hour':       return totalHours * factor
    case 'per_year':       return factor
    default:               return 0
  }
}

export function calcBidTotals(
  laborLines:  BidLaborLine[],
  laborCosts:  BidLaborCost[],
  otherCosts:  BidOtherCost[],
  overhead_pct: number,
  profit_pct:  number,
  sqft:        number | null,
) {
  const totalHours = laborLines.reduce((s, l) => s + (l.annual_hours ?? 0), 0)
  const totalLabor = laborLines.reduce(
    (s, l) => s + calcLaborLineCost(l.annual_hours, l.vacation_pct, l.sick_hours, l.rate),
    0,
  )
  const totalLaborRelated = laborCosts.reduce(
    (s, c) => s + calcCostLine(c.type, c.factor, totalLabor, totalHours),
    0,
  )
  const totalOtherDirect = otherCosts.reduce(
    (s, c) => s + calcCostLine(c.type, c.factor, totalLabor, totalHours),
    0,
  )
  const totalOperating = totalLabor + totalLaborRelated + totalOtherDirect
  const overhead       = totalOperating * overhead_pct / 100
  const grandTotal     = totalOperating + overhead
  const sellingPrice   = grandTotal * (1 + profit_pct / 100)
  const pricePerMonth  = sellingPrice / 12

  return {
    totalHours,
    totalLabor,
    totalLaborRelated,
    totalOtherDirect,
    totalOperating,
    overhead,
    grandTotal,
    sellingPrice,
    pricePerMonth,
    sqftAnnual:  sqft ? sellingPrice / sqft : null,
    sqftMonthly: sqft ? pricePerMonth / sqft : null,
  }
}
