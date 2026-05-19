import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import JobCardEditor from './JobCardEditor'

export const metadata = { title: 'Job Card | CleanBid Pro' }

export default async function JobCardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: jobCard },
    { data: routeRows },
    { data: dailyTasks },
    { data: coreDetails },
    { data: detailTasks },
    { data: prospects },
    { data: positions },
  ] = await Promise.all([
    supabase
      .from('job_cards')
      .select('*, prospects(company_name), buildings(building_name), positions(position_name)')
      .eq('id', id)
      .single(),
    supabase.from('job_card_route_rows').select('*').eq('job_card_id', id).order('sort_order'),
    supabase.from('job_card_daily_tasks').select('*').eq('job_card_id', id).order('sort_order'),
    supabase.from('job_card_detail_schedule').select('*').eq('job_card_id', id).order('sort_order'),
    supabase.from('job_card_when_detailing').select('*').eq('job_card_id', id).order('sort_order'),
    supabase.from('prospects').select('id, company_name').order('company_name'),
    supabase.from('positions').select('id, position_name').order('position_name'),
  ])

  if (!jobCard) notFound()

  const jc = jobCard as {
    route?: string | null
    positions?: { position_name: string } | null
    prospects?: { company_name: string } | null
    buildings?: { building_name: string } | null
  }

  const positionName = jc.positions?.position_name ?? ''
  const prospectName = jc.prospects?.company_name ?? ''
  const buildingName = jc.buildings?.building_name ?? ''
  const titleParts   = [positionName, jc.route].filter(Boolean).join(' | ')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="print:hidden">
        <Header
          title={titleParts || 'Job Card'}
          description={[prospectName, buildingName].filter(Boolean).join(' — ')}
        />
      </div>
      <div className="flex-1 overflow-y-auto print:overflow-visible">
        <JobCardEditor
          jobCard={jobCard as Parameters<typeof JobCardEditor>[0]['jobCard']}
          initialRouteRows={routeRows ?? []}
          initialDailyTasks={dailyTasks ?? []}
          initialCoreDetails={coreDetails ?? []}
          initialDetailTasks={detailTasks ?? []}
          prospects={prospects ?? []}
          positions={positions ?? []}
        />
      </div>
    </div>
  )
}
