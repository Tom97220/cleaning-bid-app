'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { calcPositionCost, calcCostLine } from '@/types/bid'
import type { CostType } from '@/types/bid'

export type ActionState = { error: string } | null

async function assertAuthenticated(): Promise<ActionState> {
  const role = await getUserRole()
  if (!role) return { error: 'You must be signed in.' }
  return null
}

async function assertAdmin(): Promise<ActionState> {
  const role = await getUserRole()
  if (role !== 'admin') return { error: 'Only admins can delete bid data.' }
  return null
}

function n(fd: FormData, key: string): number | null {
  const v = (fd.get(key) as string)?.trim()
  return v ? parseFloat(v) : null
}

function s(fd: FormData, key: string): string | null {
  return (fd.get(key) as string)?.trim() || null
}

function bidPath(prospectId: string, buildingId: string) {
  return `/prospects/${prospectId}/buildings/${buildingId}/bid`
}

async function fetchSection1Totals(supabase: Awaited<ReturnType<typeof createClient>>, buildingId: string) {
  const [{ data: lines }, { data: summaryRow }] = await Promise.all([
    supabase.from('bid_labor_lines').select('annual_hours, rate').eq('building_id', buildingId),
    supabase.from('bid_summary')
      .select('vacation_pct, vacation_hours_override, sick_hours_override, vacation_rate, sick_rate')
      .eq('building_id', buildingId)
      .maybeSingle(),
  ])

  const rows = lines ?? []
  const totalPositionHours = rows.reduce((s: number, l: { annual_hours: number | null }) => s + (l.annual_hours ?? 0), 0)
  const totalPositionCost  = rows.reduce((s: number, l: { annual_hours: number | null; rate: number | null }) =>
    s + calcPositionCost(l.annual_hours, l.rate), 0)

  const vacPct  = summaryRow?.vacation_pct ?? 4
  const vacHrs  = summaryRow?.vacation_hours_override ?? totalPositionHours * vacPct / 100
  const vacCost = vacHrs * (summaryRow?.vacation_rate ?? 0)
  const sickHrs = summaryRow?.sick_hours_override ?? totalPositionHours / 30
  const sickCost = sickHrs * (summaryRow?.sick_rate ?? 0)

  const totalHours = totalPositionHours
  const totalLabor = totalPositionCost + vacCost + sickCost
  return { totalHours, totalLabor }
}

// ─── Bid Summary ─────────────────────────────────────────────────────────────

export async function updateBidSummary(
  buildingId:              string,
  prospectId:              string,
  overhead_pct:            number,
  profit_markup_pct:       number,
  vacation_pct:            number,
  vacation_hours_override: number | null,
  sick_hours_override:     number | null,
  vacation_rate:           number | null,
  sick_rate:               number | null,
): Promise<ActionState> {
  const role = await getUserRole()
  if (!role) return { error: 'You must be signed in.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('bid_summary')
    .upsert(
      {
        building_id: buildingId,
        overhead_pct,
        profit_markup_pct,
        vacation_pct,
        vacation_hours_override,
        sick_hours_override,
        vacation_rate,
        sick_rate,
      },
      { onConflict: 'building_id' },
    )

  if (error) return { error: error.message }
  revalidatePath(bidPath(prospectId, buildingId))
  return null
}

// ─── Labor Lines ─────────────────────────────────────────────────────────────

export async function createLaborLine(
  buildingId: string,
  prospectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await assertAuthenticated()
  if (authError) return authError

  const annual_hours = n(formData, 'annual_hours')
  const rate         = n(formData, 'rate')
  const annual_cost  = calcPositionCost(annual_hours, rate) || null

  const supabase = await createClient()
  const { error } = await supabase.from('bid_labor_lines').insert({
    building_id: buildingId,
    position_id: s(formData, 'position_id'),
    annual_hours, rate, annual_cost,
    sort_order: n(formData, 'sort_order'),
  })
  if (error) return { error: error.message }

  revalidatePath(bidPath(prospectId, buildingId))
  redirect(bidPath(prospectId, buildingId))
}

export async function updateLaborLine(
  id: string,
  buildingId: string,
  prospectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await assertAuthenticated()
  if (authError) return authError

  const annual_hours = n(formData, 'annual_hours')
  const rate         = n(formData, 'rate')
  const annual_cost  = calcPositionCost(annual_hours, rate) || null

  const supabase = await createClient()
  const { error } = await supabase.from('bid_labor_lines').update({
    position_id: s(formData, 'position_id'),
    annual_hours, rate, annual_cost,
    sort_order: n(formData, 'sort_order'),
  }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(bidPath(prospectId, buildingId))
  redirect(bidPath(prospectId, buildingId))
}

export async function deleteLaborLine(
  id: string,
  buildingId: string,
  prospectId: string,
): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const supabase = await createClient()
  const { error } = await supabase.from('bid_labor_lines').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(bidPath(prospectId, buildingId))
  return null
}

// ─── Labor Costs ─────────────────────────────────────────────────────────────

export async function createLaborCost(
  buildingId: string,
  prospectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await assertAuthenticated()
  if (authError) return authError

  const type   = (s(formData, 'type') ?? 'per_year') as CostType
  const factor = n(formData, 'factor')

  const supabase = await createClient()
  const { totalLabor, totalHours } = await fetchSection1Totals(supabase, buildingId)
  const annual_cost = calcCostLine(type, factor, totalLabor, totalHours) || null

  const { error } = await supabase.from('bid_labor_costs').insert({
    building_id: buildingId,
    description: s(formData, 'description'),
    type, factor, annual_cost,
    sort_order: n(formData, 'sort_order'),
  })
  if (error) return { error: error.message }

  revalidatePath(bidPath(prospectId, buildingId))
  redirect(bidPath(prospectId, buildingId))
}

export async function updateLaborCost(
  id: string,
  buildingId: string,
  prospectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await assertAuthenticated()
  if (authError) return authError

  const type   = (s(formData, 'type') ?? 'per_year') as CostType
  const factor = n(formData, 'factor')

  const supabase = await createClient()
  const { totalLabor, totalHours } = await fetchSection1Totals(supabase, buildingId)
  const annual_cost = calcCostLine(type, factor, totalLabor, totalHours) || null

  const { error } = await supabase.from('bid_labor_costs').update({
    description: s(formData, 'description'),
    type, factor, annual_cost,
    sort_order: n(formData, 'sort_order'),
  }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(bidPath(prospectId, buildingId))
  redirect(bidPath(prospectId, buildingId))
}

export async function deleteLaborCost(
  id: string,
  buildingId: string,
  prospectId: string,
): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const supabase = await createClient()
  const { error } = await supabase.from('bid_labor_costs').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(bidPath(prospectId, buildingId))
  return null
}

// ─── Other Costs ─────────────────────────────────────────────────────────────

export async function createOtherCost(
  buildingId: string,
  prospectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await assertAuthenticated()
  if (authError) return authError

  const type   = (s(formData, 'type') ?? 'per_year') as CostType
  const factor = n(formData, 'factor')

  const supabase = await createClient()
  const { totalLabor, totalHours } = await fetchSection1Totals(supabase, buildingId)
  const annual_cost = calcCostLine(type, factor, totalLabor, totalHours) || null

  const { error } = await supabase.from('bid_other_costs').insert({
    building_id: buildingId,
    description: s(formData, 'description'),
    type, factor, annual_cost,
    sort_order: n(formData, 'sort_order'),
  })
  if (error) return { error: error.message }

  revalidatePath(bidPath(prospectId, buildingId))
  redirect(bidPath(prospectId, buildingId))
}

export async function updateOtherCost(
  id: string,
  buildingId: string,
  prospectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await assertAuthenticated()
  if (authError) return authError

  const type   = (s(formData, 'type') ?? 'per_year') as CostType
  const factor = n(formData, 'factor')

  const supabase = await createClient()
  const { totalLabor, totalHours } = await fetchSection1Totals(supabase, buildingId)
  const annual_cost = calcCostLine(type, factor, totalLabor, totalHours) || null

  const { error } = await supabase.from('bid_other_costs').update({
    description: s(formData, 'description'),
    type, factor, annual_cost,
    sort_order: n(formData, 'sort_order'),
  }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(bidPath(prospectId, buildingId))
  redirect(bidPath(prospectId, buildingId))
}

export async function deleteOtherCost(
  id: string,
  buildingId: string,
  prospectId: string,
): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const supabase = await createClient()
  const { error } = await supabase.from('bid_other_costs').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(bidPath(prospectId, buildingId))
  return null
}
