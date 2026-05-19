import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import NewJobCardForm from './NewJobCardForm'

export const metadata = { title: 'New Job Card | CleanBid Pro' }

export default async function NewJobCardPage() {
  const supabase = await createClient()
  const [{ data: prospects }, { data: positions }] = await Promise.all([
    supabase.from('prospects').select('id, company_name').order('company_name'),
    supabase.from('positions').select('id, position_name').order('position_name'),
  ])

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header title="New Job Card" description="Select a prospect and position to get started" />
      <div className="p-6 max-w-lg">
        <NewJobCardForm prospects={prospects ?? []} positions={positions ?? []} />
      </div>
    </div>
  )
}
