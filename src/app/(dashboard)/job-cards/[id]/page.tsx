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
    { data: detailSchedule },
    { data: whenDetailing },
    { data: prospects },
  ] = await Promise.all([
    supabase
      .from('job_cards')
      .select('*, prospects(company_name), buildings(building_name)')
      .eq('id', id)
      .single(),
    supabase.from('job_card_route_rows').select('*').eq('job_card_id', id).order('sort_order'),
    supabase.from('job_card_daily_tasks').select('*').eq('job_card_id', id).order('sort_order'),
    supabase.from('job_card_detail_schedule').select('*').eq('job_card_id', id).order('sort_order'),
    supabase.from('job_card_when_detailing').select('*').eq('job_card_id', id).order('sort_order'),
    supabase.from('prospects').select('id, company_name').order('company_name'),
  ])

  if (!jobCard) notFound()

  const prospectName  = (jobCard as { prospects: { company_name: string } | null }).prospects?.company_name ?? ''
  const buildingName  = (jobCard as { buildings: { building_name: string } | null }).buildings?.building_name ?? ''

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="print:hidden">
        <Header
          title={jobCard.position_title || 'Job Card'}
          description={[prospectName, buildingName].filter(Boolean).join(' — ')}
        />
      </div>
      <div className="flex-1 overflow-y-auto print:overflow-visible">
        <JobCardEditor
          jobCard={jobCard as Parameters<typeof JobCardEditor>[0]['jobCard']}
          initialRouteRows={routeRows ?? []}
          initialDailyTasks={dailyTasks ?? []}
          initialDetailSchedule={detailSchedule ?? []}
          initialWhenDetailing={whenDetailing ?? []}
          prospects={prospects ?? []}
        />
      </div>
    </div>
  )
}
