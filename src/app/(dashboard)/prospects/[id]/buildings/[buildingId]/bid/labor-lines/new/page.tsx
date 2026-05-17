import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import LaborLineForm from '../LaborLineForm'

export const metadata = { title: 'Add Labor Line | CleanBid Pro' }

export default async function NewLaborLinePage({
  params,
}: {
  params: Promise<{ id: string; buildingId: string }>
}) {
  const { id, buildingId } = await params
  const [role, supabase] = await Promise.all([getUserRole(), createClient()])
  if (!role) notFound()

  const { data: positions } = await supabase
    .from('positions')
    .select('id, position_name')
    .order('position_name')

  return (
    <div className="flex flex-col h-full">
      <Header title="Add Labor Line" description="Section 1 — Labor by Position" />
      <div className="p-6 max-w-2xl">
        <LaborLineForm
          buildingId={buildingId}
          prospectId={id}
          positions={positions ?? []}
        />
      </div>
    </div>
  )
}
