import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import CostLineForm from '../../CostLineForm'
import { createOtherCost } from '../../actions'
import { calcPositionCost } from '@/types/bid'

export const metadata = { title: 'Add Other Cost | CleanBid Pro' }

export default async function NewOtherCostPage({
  params,
}: {
  params: Promise<{ id: string; buildingId: string }>
}) {
  const { id, buildingId } = await params
  const [role, supabase] = await Promise.all([getUserRole(), createClient()])
  if (!role) notFound()

  const [{ data: lines }, { data: summaryRow }] = await Promise.all([
    supabase.from('bid_labor_lines').select('annual_hours, rate').eq('building_id', buildingId),
    supabase.from('bid_summary')
      .select('vacation_pct, vacation_hours_override, sick_hours_override, vacation_rate, sick_rate')
      .eq('building_id', buildingId)
      .maybeSingle(),
  ])

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
      <Header title="Add Other Direct Cost" description="Section 3" />
      <div className="p-6 max-w-2xl">
        <CostLineForm
          action={createOtherCost.bind(null, buildingId, id)}
          cancelHref={cancelHref}
          sectionLabel="Other Direct Cost"
          totalLabor={totalLabor}
          totalHours={totalHours}
        />
      </div>
    </div>
  )
}
