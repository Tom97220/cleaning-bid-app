import Header from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import ReportsView from './ReportsView'

export const metadata = { title: 'Reports | CleanBid Pro' }

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: prospects } = await supabase
    .from('prospects')
    .select('id, company_name')
    .order('company_name')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Reports"
        description="Select a prospect and building, choose reports, then generate print-ready output"
      />
      <div className="flex-1 overflow-hidden">
        <ReportsView prospects={prospects ?? []} />
      </div>
    </div>
  )
}
