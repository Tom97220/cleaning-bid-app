import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import OtherCostTypeForm from '../OtherCostTypeForm'

export const metadata = { title: 'New Other Cost Type | CleanBid Pro' }

export default async function NewOtherCostTypePage() {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/')

  return (
    <div className="flex flex-col h-full">
      <Header
        title="New Other Cost Type"
        description="Add a lookup value for Section 3 other direct costs"
      />
      <div className="p-6 max-w-2xl">
        <OtherCostTypeForm />
      </div>
    </div>
  )
}
