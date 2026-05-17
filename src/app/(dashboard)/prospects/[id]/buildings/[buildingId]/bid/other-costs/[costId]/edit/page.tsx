import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import CostLineForm from '../../../CostLineForm'
import { updateOtherCost } from '../../../actions'
import { calcPositionCost } from '@/types/bid'
import type { BidOtherCost } from '@/types/bid'

export const metadata = { title: 'Edit Other Cost | CleanBid Pro' }

export default async function EditOtherCostPage({
  params,
}: {
  params: Promise<{ id: string; buildingId: string; costId: string }>
}) {
  const { id, buildingId, costId } = await params
  const [role, supabase] = await Promise.all([getUserRole(), createClient()])
  if (!role) notFound()

  const [{ data: item }, { data: lines }, { data: summaryRow }] = await Promise.all([
    supabase.from('bid_other_costs').select('*').eq('id', costId).eq('building_id', buildingId).single(),
    supabase.from('bid_labor_lines').select('annual_hours, rate').eq('building_id', buildingId),
    supabase.from('bid_summary')
      .select('vacation_pct, vacation_hours_override, sick_hours_override, vacation_rate, sick_rate')
      .eq('building_id', buildingId)
      .maybeSingle(),
  ])

  if (!item) notFound()

  const totalPositionHours = (lines ?? []).reduce((s, l) => s + (l.annual_hours ?? 0), 0)
  const totalPositionCost  = (lines ?? []).reduce((s, l) => s + calcPositionCost(l.annual_hours, l.rate), 0)
  const vacPct   = summaryRow?.vacation_pct ?? 4
  const vacHrs   = summaryRow?.vacation_hours_override ?? totalPositionHours * vacPct / 100
  const vacCost  = vacHrs * (summaryRow?.vacation_rate ?? 0)
  const sickHrs  = summaryRow?.sick_hours_override ?? totalPositionHours / 30
  const sickCost = sickHrs * (summaryRow?.sick_rate ?? 0)
  const totalHours = totalPositionHours
  const totalLabor = totalPositionCost + vacCost + sickCost

  const cancelHref = `/prospects/${id}/buildings/${buildingId}/bid`

  return (
    <div className="flex flex-col h-full">
      <Header title="Edit Other Direct Cost" description="Section 3" />
      <div className="p-6 max-w-2xl">
        <CostLineForm
          item={item as BidOtherCost}
          action={updateOtherCost.bind(null, costId, buildingId, id)}
          cancelHref={cancelHref}
          sectionLabel="Other Direct Cost"
          totalLabor={totalLabor}
          totalHours={totalHours}
        />
      </div>
    </div>
  )
}
