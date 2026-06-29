import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import ReportsView, { ConsolidatedReportsView } from './ReportsView'
import ReportsSearchView from './ReportsSearchView'

export const metadata = { title: 'Reports | CleanBid Pro' }

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ prospectId?: string; buildingId?: string }>
}) {
  const { prospectId, buildingId } = await searchParams

  if (prospectId && buildingId) {
    const supabase = await createClient()
    const [
      { data: companySettings },
      { data: prospect },
      { data: building },
    ] = await Promise.all([
      supabase.from('company_settings').select('*').maybeSingle(),
      supabase.from('prospects').select('id, company_name, logo_url').eq('id', prospectId).single(),
      supabase.from('buildings')
        .select('id, building_name, square_feet, address, address_2, city, state, zip, floors, common_sqft, num_restrooms, num_elevators, num_stairwells, notes, service_days')
        .eq('id', buildingId).single(),
    ])

    if (prospect && building) {
      return (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="print:hidden">
            <Header
              title="Reports"
              description={`${prospect.company_name} — ${building.building_name}`}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <ReportsView
              prospect={prospect}
              building={building}
              companySettings={companySettings ?? null}
            />
          </div>
        </div>
      )
    }
  }

  // Prospect selected without a specific building → Consolidated Investment Recap.
  if (prospectId) {
    const supabase = await createClient()
    const [
      { data: companySettings },
      { data: prospect },
      { data: buildings },
    ] = await Promise.all([
      supabase.from('company_settings').select('*').maybeSingle(),
      supabase.from('prospects').select('id, company_name, logo_url').eq('id', prospectId).single(),
      supabase.from('buildings')
        .select('id, building_name, square_feet, address, address_2, city, state, zip, floors, common_sqft, num_restrooms, num_elevators, num_stairwells, notes, service_days')
        .eq('prospect_id', prospectId).order('building_name'),
    ])

    if (prospect) {
      return (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="print:hidden">
            <Header
              title="Consolidated Recap"
              description={prospect.company_name}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <ConsolidatedReportsView
              prospect={prospect}
              buildings={buildings ?? []}
              companySettings={companySettings ?? null}
            />
          </div>
        </div>
      )
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header
        title="Reports"
        description="Search prospects and buildings to generate reports"
      />
      <div className="p-6">
        <ReportsSearchView />
      </div>
    </div>
  )
}
