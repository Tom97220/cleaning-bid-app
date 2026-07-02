export type CostType   = 'percent_markup' | 'per_hour' | 'per_year'
export type MarginType = 'percent' | 'fixed_fee'

export const COST_TYPE_LABELS: Record<CostType, string> = {
  percent_markup: '% of Labor',
  per_hour:       'Per Hour',
  per_year:       'Per Year',
}

export interface BidSummary {
  id:                      string
  building_id:             string
  margin_type:             MarginType
  margin_value:            number
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
  margin_type:         MarginType,
  margin_value:        number,
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

  const totalHours = totalPositionHours
  const totalLabor = totalPositionCost + vacationCost + sickCost

  const totalLaborRelated = laborCosts.reduce(
    (s, c) => s + calcCostLine(c.type, c.factor, totalLabor, totalHours),
    0,
  )
  const totalOtherDirect = otherCosts.reduce(
    (s, c) => s + calcCostLine(c.type, c.factor, totalLabor, totalHours),
    0,
  )
  const totalCost = totalLabor + totalLaborRelated + totalOtherDirect

  let sellingPrice: number
  if (margin_type === 'percent') {
    const gm = margin_value / 100
    sellingPrice = gm < 1 ? totalCost / (1 - gm) : totalCost
  } else {
    sellingPrice = totalCost + margin_value
  }

  const pricePerMonth = sellingPrice / 12

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
    totalCost,
    sellingPrice,
    pricePerMonth,
    sqftAnnual:  sqft ? sellingPrice / sqft : null,
    sqftMonthly: sqft ? pricePerMonth / sqft : null,
  }
}

export type BidTotals = ReturnType<typeof calcBidTotals>

// Consolidated (multi-building) recap totals. Dollar/hour figures are summed
// directly across buildings; ratios (labor rate, margin, $/sqft) are RE-BLENDED
// from the summed numerator over the summed denominator — never the average of
// per-building ratios. Each item pairs a building's BidTotals with the manual
// square_feet used for that building's pricing sqft.
export function calcConsolidatedTotals(
  items: { totals: BidTotals; square_feet: number | null }[],
) {
  const sum = (get: (t: BidTotals) => number) =>
    items.reduce((s, it) => s + get(it.totals), 0)

  const totalPositionHours = sum(t => t.totalPositionHours)
  const totalPositionCost  = sum(t => t.totalPositionCost)
  const vacationHours      = sum(t => t.vacationHours)
  const vacationCost       = sum(t => t.vacationCost)
  const sickHours          = sum(t => t.sickHours)
  const sickCost           = sum(t => t.sickCost)
  const totalHours         = sum(t => t.totalHours)
  const totalLabor         = sum(t => t.totalLabor)
  const totalLaborRelated  = sum(t => t.totalLaborRelated)
  const totalOtherDirect   = sum(t => t.totalOtherDirect)
  const totalCost          = sum(t => t.totalCost)
  const sellingPrice       = sum(t => t.sellingPrice)
  const pricePerMonth      = sum(t => t.pricePerMonth)
  const profit             = sellingPrice - totalCost

  const totalSqft = items.reduce((s, it) => s + (it.square_feet ?? 0), 0)

  // Blended ratios — Σ numerator / Σ denominator.
  // Labor rate is the pure wage rate: Σ position cost / Σ position hours (excludes
  // vacation/sick, matching calcBidTotals' totalPositionCost / totalPositionHours).
  const blendedLaborRate = totalPositionHours > 0 ? totalPositionCost / totalPositionHours : null
  const blendedMargin    = sellingPrice > 0 ? profit / sellingPrice : null

  return {
    buildingCount: items.length,
    totalPositionHours,
    totalPositionCost,
    vacationHours,
    vacationCost,
    sickHours,
    sickCost,
    totalHours,
    totalLabor,
    totalLaborRelated,
    totalOtherDirect,
    totalCost,
    sellingPrice,
    pricePerMonth,
    profit,
    totalSqft:        totalSqft > 0 ? totalSqft : null,
    blendedLaborRate,
    blendedMargin,
    sqftAnnual:       totalSqft > 0 ? sellingPrice  / totalSqft : null,
    sqftMonthly:      totalSqft > 0 ? pricePerMonth / totalSqft : null,
  }
}
