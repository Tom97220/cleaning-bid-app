import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import LaborCostTypeForm from '../../LaborCostTypeForm'

export const metadata = { title: 'Edit Labor Cost Type | CleanBid Pro' }

export default async function EditLaborCostTypePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/')

  const { id } = await params
  const supabase = await createClient()

  const { data: item } = await supabase
    .from('labor_cost_types')
    .select('*')
    .eq('id', id)
    .single()

  if (!item) notFound()

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Edit: ${item.name}`}
        description="Update labor cost type name"
      />
      <div className="p-6 max-w-2xl">
        <LaborCostTypeForm item={item} />
      </div>
    </div>
  )
}
