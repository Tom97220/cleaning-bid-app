import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import BuildingForm from '../BuildingForm'

export const metadata = { title: 'Add Building | CleanBid Pro' }

export default async function NewBuildingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [role, supabase] = await Promise.all([getUserRole(), createClient()])
  if (!role) notFound()

  const [{ data: prospect }, { data: buildingTypes }] = await Promise.all([
    supabase.from('prospects').select('company_name').eq('id', id).single(),
    supabase.from('building_types').select('id, type_name').order('type_name'),
  ])

  if (!prospect) notFound()

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Add Building"
        description={prospect.company_name}
      />
      <div className="p-6 max-w-3xl">
        <BuildingForm
          prospectId={id}
          buildingTypes={buildingTypes ?? []}
        />
      </div>
    </div>
  )
}
