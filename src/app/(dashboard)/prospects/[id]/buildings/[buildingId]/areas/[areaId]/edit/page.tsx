import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import AreaForm from '../../AreaForm'

export const metadata = { title: 'Edit Area | CleanBid Pro' }

export default async function EditAreaPage({
  params,
}: {
  params: Promise<{ id: string; buildingId: string; areaId: string }>
}) {
  const { id, buildingId, areaId } = await params

  const [role, supabase] = await Promise.all([getUserRole(), createClient()])
  if (!role) notFound()

  const { data: area } = await supabase
    .from('areas')
    .select('*')
    .eq('id', areaId)
    .eq('building_id', buildingId)
    .single()

  if (!area) notFound()

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Edit: ${area.area_name}`}
        description="Update area details"
      />
      <div className="p-6 max-w-2xl">
        <AreaForm area={area} buildingId={buildingId} prospectId={id} />
      </div>
    </div>
  )
}
