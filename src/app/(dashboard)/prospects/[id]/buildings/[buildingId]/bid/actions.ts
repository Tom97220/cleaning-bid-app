'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'
import { calcPositionCost, calcCostLine } from '@/types/bid'
import type { CostType, MarginType } from '@/types/bid'

export type ActionState = { error: string } | null

function bidPath(prospectId: string, buildingId: string) {
  return `/prospects/${prospectId}/buildings/${buildingId}/bid`
}

export interface BidLineUpsert {
  id: string | null
  position_id: string | null
  annual_hours: number | null
  rate: number | null
}

export interface BidCostUpsert {
  id: string | null
  description: string | null
  type: string
  factor: number | null
}

export interface BidSavePayload {
  summary: {
    margin_type: MarginType
    margin_value: number
    vacation_pct: number
    vacation_hours_override: number | null
    sick_hours_override: number | null
    vacation_rate: number | null
    sick_rate: number | null
  }
  laborLines: { upserts: BidLineUpsert[]; deletes: string[] }
  laborCosts: { upserts: BidCostUpsert[]; deletes: string[] }
  otherCosts: { upserts: BidCostUpsert[]; deletes: string[] }
}

export async function saveBidAll(
  buildingId: string,
  prospectId: string,
  payload: BidSavePayload,
): Promise<ActionState> {
  const role = await getUserRole()
  if (!role) return { error: 'You must be signed in.' }

  const hasDeletes =
    payload.laborLines.deletes.length > 0 ||
    payload.laborCosts.deletes.length > 0 ||
    payload.otherCosts.deletes.length > 0
  if (hasDeletes && role !== 'admin') return { error: 'Only admins can delete bid data.' }

  const supabase = await createClient()

  // Save summary
  const { error: sErr } = await supabase.from('bid_summary').upsert(
    { building_id: buildingId, ...payload.summary },
    { onConflict: 'building_id' },
  )
  if (sErr) return { error: sErr.message }

  // Compute labor totals for annual_cost denormalization
  const { summary, laborLines: { upserts: lu } } = payload
  const totalPositionHours = lu.reduce((s, l) => s + (l.annual_hours ?? 0), 0)
  const totalPositionCost  = lu.reduce((s, l) => s + calcPositionCost(l.annual_hours, l.rate), 0)
  const vacHrs  = summary.vacation_hours_override ?? totalPositionHours * summary.vacation_pct / 100
  const vacCost = vacHrs * (summary.vacation_rate ?? 0)
  const sickHrs  = summary.sick_hours_override ?? totalPositionHours / 30
  const sickCost = sickHrs * (summary.sick_rate ?? 0)
  const totalHours = totalPositionHours
  const totalLabor = totalPositionCost + vacCost + sickCost

  // Labor lines — deletes
  if (payload.laborLines.deletes.length > 0) {
    const { error } = await supabase.from('bid_labor_lines').delete().in('id', payload.laborLines.deletes)
    if (error) return { error: error.message }
  }
  // Labor lines — updates
  for (const r of payload.laborLines.upserts.filter(r => r.id !== null)) {
    const annual_cost = calcPositionCost(r.annual_hours, r.rate) || null
    const { error } = await supabase.from('bid_labor_lines')
      .update({ position_id: r.position_id, annual_hours: r.annual_hours, rate: r.rate, annual_cost })
      .eq('id', r.id!)
    if (error) return { error: error.message }
  }
  // Labor lines — inserts
  const newLaborLines = payload.laborLines.upserts.filter(r => r.id === null)
  if (newLaborLines.length > 0) {
    const { error } = await supabase.from('bid_labor_lines').insert(
      newLaborLines.map(r => ({
        building_id: buildingId,
        position_id: r.position_id,
        annual_hours: r.annual_hours,
        rate: r.rate,
        annual_cost: calcPositionCost(r.annual_hours, r.rate) || null,
      })),
    )
    if (error) return { error: error.message }
  }

  // Labor costs — deletes
  if (payload.laborCosts.deletes.length > 0) {
    const { error } = await supabase.from('bid_labor_costs').delete().in('id', payload.laborCosts.deletes)
    if (error) return { error: error.message }
  }
  // Labor costs — updates
  for (const r of payload.laborCosts.upserts.filter(r => r.id !== null)) {
    const annual_cost = calcCostLine(r.type as CostType, r.factor, totalLabor, totalHours) || null
    const { error } = await supabase.from('bid_labor_costs')
      .update({ description: r.description, type: r.type, factor: r.factor, annual_cost })
      .eq('id', r.id!)
    if (error) return { error: error.message }
  }
  // Labor costs — inserts
  const newLaborCosts = payload.laborCosts.upserts.filter(r => r.id === null)
  if (newLaborCosts.length > 0) {
    const { error } = await supabase.from('bid_labor_costs').insert(
      newLaborCosts.map(r => ({
        building_id: buildingId,
        description: r.description,
        type: r.type,
        factor: r.factor,
        annual_cost: calcCostLine(r.type as CostType, r.factor, totalLabor, totalHours) || null,
      })),
    )
    if (error) return { error: error.message }
  }

  // Other costs — deletes
  if (payload.otherCosts.deletes.length > 0) {
    const { error } = await supabase.from('bid_other_costs').delete().in('id', payload.otherCosts.deletes)
    if (error) return { error: error.message }
  }
  // Other costs — updates
  for (const r of payload.otherCosts.upserts.filter(r => r.id !== null)) {
    const annual_cost = calcCostLine(r.type as CostType, r.factor, totalLabor, totalHours) || null
    const { error } = await supabase.from('bid_other_costs')
      .update({ description: r.description, type: r.type, factor: r.factor, annual_cost })
      .eq('id', r.id!)
    if (error) return { error: error.message }
  }
  // Other costs — inserts
  const newOtherCosts = payload.otherCosts.upserts.filter(r => r.id === null)
  if (newOtherCosts.length > 0) {
    const { error } = await supabase.from('bid_other_costs').insert(
      newOtherCosts.map(r => ({
        building_id: buildingId,
        description: r.description,
        type: r.type,
        factor: r.factor,
        annual_cost: calcCostLine(r.type as CostType, r.factor, totalLabor, totalHours) || null,
      })),
    )
    if (error) return { error: error.message }
  }

  revalidatePath(bidPath(prospectId, buildingId))
  return null
}
