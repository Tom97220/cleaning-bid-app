import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import PositionForm from '../PositionForm'

export const metadata = { title: 'New Position | CleanBid Pro' }

export default async function NewPositionPage() {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/positions')

  return (
    <div className="flex flex-col h-full">
      <Header
        title="New Position"
        description="Define a new cleaning position and hourly rate"
      />
      <div className="p-6 max-w-2xl">
        <PositionForm />
      </div>
    </div>
  )
}
