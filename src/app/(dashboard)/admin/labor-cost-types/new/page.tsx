import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import LaborCostTypeForm from '../LaborCostTypeForm'

export const metadata = { title: 'New Labor Cost Type | CleanBid Pro' }

export default async function NewLaborCostTypePage() {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/')

  return (
    <div className="flex flex-col h-full">
      <Header
        title="New Labor Cost Type"
        description="Add a lookup value for Section 2 labor-related costs"
      />
      <div className="p-6 max-w-2xl">
        <LaborCostTypeForm />
      </div>
    </div>
  )
}
