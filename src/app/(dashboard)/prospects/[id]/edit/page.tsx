import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import ProspectForm from '../../ProspectForm'

export const metadata = { title: 'Edit Prospect | CleanBid Pro' }

export default async function EditProspectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: prospect } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', id)
    .single()

  if (!prospect) notFound()

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Edit: ${prospect.company_name}`}
        description="Update prospect information"
      />
      <div className="p-6 max-w-3xl">
        <ProspectForm prospect={prospect} />
      </div>
    </div>
  )
}
