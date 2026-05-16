import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import PositionForm from '../../PositionForm'

export const metadata = { title: 'Edit Position | CleanBid Pro' }

export default async function EditPositionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/positions')

  const { id } = await params
  const supabase = await createClient()

  const { data: position } = await supabase
    .from('positions')
    .select('*')
    .eq('id', id)
    .single()

  if (!position) notFound()

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Edit: ${position.position_name}`}
        description="Update position details and hourly rate"
      />
      <div className="p-6 max-w-2xl">
        <PositionForm position={position} />
      </div>
    </div>
  )
}
