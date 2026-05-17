export type CostType = 'percent_markup' | 'per_hour' | 'per_year'

export const COST_TYPE_LABELS: Record<CostType, string> = {
  percent_markup: '% of Labor',
  per_hour:       'Per Hour',
  per_year:       'Per Year',
}

export interface BidSummary {
  id:                      string
  building_id:             string
  overhead_pct:            number
  profit_markup_pct:       number
  vacation_pct:            number
  vacation_hours_override: number | null
  sick_hours_override:     number | null
  vacation_rate:           number | null
  sick_rate:               number | null
  created_at:              string
  updated_at:              string
}

export interface BidLaborLine {
  id:           string
  building_id:  string
  position_id:  string | null
  annual_hours: number | null
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

export function calcPositionCost(annual_hours: number | null, rate: number | null): number {
  if (!annual_hours || !rate) return 0
  return annual_hours * rate
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
  laborLines:          BidLaborLine[],
  laborCosts:          BidLaborCost[],
  otherCosts:          BidOtherCost[],
  overhead_pct:        number,
  profit_pct:          number,
  sqft:                number | null,
  vacationPct:         number,
  vacationHrsOverride: number | null,
  sickHrsOverride:     number | null,
  vacationRate:        number | null,
  sickRate:            number | null,
) {
  const totalPositionHours = laborLines.reduce((s, l) => s + (l.annual_hours ?? 0), 0)
  const totalPositionCost  = laborLines.reduce((s, l) => s + calcPositionCost(l.annual_hours, l.rate), 0)

  const vacationHoursDefault = totalPositionHours * vacationPct / 100
  const vacationHours        = vacationHrsOverride ?? vacationHoursDefault
  const vacationCost         = vacationHours * (vacationRate ?? 0)

  const sickHoursDefault = totalPositionHours / 30
  const sickHours        = sickHrsOverride ?? sickHoursDefault
  const sickCost         = sickHours * (sickRate ?? 0)

  const totalHours  = totalPositionHours
  const totalLabor  = totalPositionCost + vacationCost + sickCost

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
    totalPositionHours,
    totalPositionCost,
    vacationHoursDefault,
    vacationHours,
    vacationCost,
    sickHoursDefault,
    sickHours,
    sickCost,
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
