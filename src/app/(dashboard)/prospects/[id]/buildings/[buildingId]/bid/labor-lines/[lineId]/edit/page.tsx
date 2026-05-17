import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import LaborLineForm from '../../LaborLineForm'
import type { BidLaborLine } from '@/types/bid'

export const metadata = { title: 'Edit Labor Line | CleanBid Pro' }

export default async function EditLaborLinePage({
  params,
}: {
  params: Promise<{ id: string; buildingId: string; lineId: string }>
}) {
  const { id, buildingId, lineId } = await params
  const [role, supabase] = await Promise.all([getUserRole(), createClient()])
  if (!role) notFound()

  const [{ data: item }, { data: positions }] = await Promise.all([
    supabase.from('bid_labor_lines').select('*').eq('id', lineId).eq('building_id', buildingId).single(),
    supabase.from('positions').select('id, position_name').order('position_name'),
  ])

  if (!item) notFound()

  return (
    <div className="flex flex-col h-full">
      <Header title="Edit Labor Line" description="Section 1 — Labor by Position" />
      <div className="p-6 max-w-2xl">
        <LaborLineForm
          item={item as BidLaborLine}
          buildingId={buildingId}
          prospectId={id}
          positions={positions ?? []}
        />
      </div>
    </div>
  )
}
