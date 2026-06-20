import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PrintView from './PrintView'

export const metadata = { title: ' ', robots: 'noindex' }

export default async function JobCardPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ logo?: string }>
}) {
  const { id } = await params
  const { logo } = await searchParams
  const includeLogo = logo !== '0'
  const supabase = await createClient()

  const [
    { data: jobCard },
    { data: routeRows },
    { data: dailyTasks },
    { data: coreDetails },
    { data: detailTasks },
    { data: companySettings },
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
    supabase.from('company_settings').select('logo_url').maybeSingle(),
  ])

  if (!jobCard) notFound()

  return (
    <PrintView
      jobCard={jobCard as Parameters<typeof PrintView>[0]['jobCard']}
      routeRows={routeRows ?? []}
      dailyTasks={dailyTasks ?? []}
      coreDetails={coreDetails ?? []}
      detailTasks={detailTasks ?? []}
      logoUrl={includeLogo ? (companySettings?.logo_url ?? null) : null}
    />
  )
}
