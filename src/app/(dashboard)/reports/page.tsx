import Header from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import ReportsView from './ReportsView'

export const metadata = { title: 'Reports | CleanBid Pro' }

export default async function ReportsPage() {
  const supabase = await createClient()

  const [{ data: prospects }, { data: companySettings }, { data: locations }] = await Promise.all([
    supabase.from('prospects').select('id, company_name').order('company_name'),
    supabase.from('company_settings').select('*').maybeSingle(),
    supabase
      .from('company_locations')
      .select('*')
      .order('is_default', { ascending: false })
      .order('location_name'),
  ])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="print:hidden">
        <Header
          title="Reports"
          description="Select a prospect and building, choose reports, then generate print-ready output"
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <ReportsView
          prospects={prospects ?? []}
          companySettings={companySettings ?? null}
          locations={locations ?? []}
        />
      </div>
    </div>
  )
}
