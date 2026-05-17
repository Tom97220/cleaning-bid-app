import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import CostLineForm from '../../../CostLineForm'
import { updateLaborCost } from '../../../actions'
import { calcLaborLineCost } from '@/types/bid'
import type { BidLaborCost } from '@/types/bid'

export const metadata = { title: 'Edit Labor Cost | CleanBid Pro' }

export default async function EditLaborCostPage({
  params,
}: {
  params: Promise<{ id: string; buildingId: string; costId: string }>
}) {
  const { id, buildingId, costId } = await params
  const [role, supabase] = await Promise.all([getUserRole(), createClient()])
  if (!role) notFound()

  const [{ data: item }, { data: lines }] = await Promise.all([
    supabase.from('bid_labor_costs').select('*').eq('id', costId).eq('building_id', buildingId).single(),
    supabase.from('bid_labor_lines').select('annual_hours, vacation_pct, sick_hours, rate').eq('building_id', buildingId),
  ])

  if (!item) notFound()

  const totalHours = (lines ?? []).reduce((s, l) => s + (l.annual_hours ?? 0), 0)
  const totalLabor = (lines ?? []).reduce(
    (s, l) => s + calcLaborLineCost(l.annual_hours, l.vacation_pct, l.sick_hours, l.rate),
    0,
  )

  const cancelHref = `/prospects/${id}/buildings/${buildingId}/bid`

  return (
    <div className="flex flex-col h-full">
      <Header title="Edit Labor Related Cost" description="Section 2" />
      <div className="p-6 max-w-2xl">
        <CostLineForm
          item={item as BidLaborCost}
          action={updateLaborCost.bind(null, costId, buildingId, id)}
          cancelHref={cancelHref}
          sectionLabel="Labor Related Cost"
          totalLabor={totalLabor}
          totalHours={totalHours}
        />
      </div>
    </div>
  )
}
