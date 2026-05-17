import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import AreaForm from '../AreaForm'

export const metadata = { title: 'Add Area | CleanBid Pro' }

export default async function NewAreaPage({
  params,
}: {
  params: Promise<{ id: string; buildingId: string }>
}) {
  const { id, buildingId } = await params

  const [role, supabase] = await Promise.all([getUserRole(), createClient()])
  if (!role) notFound()

  const { data: building } = await supabase
    .from('buildings')
    .select('building_name')
    .eq('id', buildingId)
    .eq('prospect_id', id)
    .single()

  if (!building) notFound()

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Add Area"
        description={building.building_name}
      />
      <div className="p-6 max-w-2xl">
        <AreaForm buildingId={buildingId} prospectId={id} />
      </div>
    </div>
  )
}
