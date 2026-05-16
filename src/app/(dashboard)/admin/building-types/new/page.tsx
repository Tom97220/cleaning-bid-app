import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import BuildingTypeForm from '../BuildingTypeForm'

export const metadata = { title: 'New Building Type | CleanBid Pro' }

export default async function NewBuildingTypePage() {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/')

  return (
    <div className="flex flex-col h-full">
      <Header
        title="New Building Type"
        description="Add a building type lookup value"
      />
      <div className="p-6 max-w-2xl">
        <BuildingTypeForm />
      </div>
    </div>
  )
}
