import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import BuildingForm from '../../BuildingForm'

export const metadata = { title: 'Edit Building | CleanBid Pro' }

export default async function EditBuildingPage({
  params,
}: {
  params: Promise<{ id: string; buildingId: string }>
}) {
  const { id, buildingId } = await params

  const [role, supabase] = await Promise.all([getUserRole(), createClient()])
  if (!role) notFound()

  const [{ data: building }, { data: buildingTypes }] = await Promise.all([
    supabase.from('buildings').select('*').eq('id', buildingId).eq('prospect_id', id).single(),
    supabase.from('building_types').select('id, type_name').order('type_name'),
  ])

  if (!building) notFound()

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Edit: ${building.building_name}`}
        description="Update building details"
      />
      <div className="p-6 max-w-3xl">
        <BuildingForm
          building={building}
          prospectId={id}
          buildingTypes={buildingTypes ?? []}
        />
      </div>
    </div>
  )
}
