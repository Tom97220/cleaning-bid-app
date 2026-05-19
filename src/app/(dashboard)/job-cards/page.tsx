import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import JobCardsListView, { type JobCardRow } from './JobCardsListView'

export const metadata = { title: 'Job Cards | CleanBid Pro' }

export default async function JobCardsPage() {
  const [supabase, role] = await Promise.all([createClient(), getUserRole()])

  const { data: jobCards } = await supabase
    .from('job_cards')
    .select('id, position_title, team, revised_date, prospects(company_name), buildings(building_name)')
    .order('updated_at', { ascending: false })

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header
        title="Job Cards"
        description="Create and manage job cards for your cleaning staff"
      />
      <div className="flex-1 p-6">
        <JobCardsListView jobCards={(jobCards ?? []) as unknown as JobCardRow[]} role={role ?? 'user'} />
      </div>
    </div>
  )
}
