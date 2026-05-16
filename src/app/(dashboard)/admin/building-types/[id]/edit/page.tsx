import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import BuildingTypeForm from '../../BuildingTypeForm'

export const metadata = { title: 'Edit Building Type | CleanBid Pro' }

export default async function EditBuildingTypePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/')

  const { id } = await params
  const supabase = await createClient()

  const { data: buildingType } = await supabase
    .from('building_types')
    .select('*')
    .eq('id', id)
    .single()

  if (!buildingType) notFound()

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Edit: ${buildingType.type_name}`}
        description="Update building type details"
      />
      <div className="p-6 max-w-2xl">
        <BuildingTypeForm buildingType={buildingType} />
      </div>
    </div>
  )
}
