import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import AreaSpreadsheet from './areas/AreaSpreadsheet'
import BuildingTabNav from './BuildingTabNav'
import type { BuildingRow } from '@/types/building'
import type { TaskCodeForForm } from '@/types/task-line-item'

export const metadata = { title: 'Building | CleanBid Pro' }

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">{value ?? '—'}</dd>
    </div>
  )
}

function fmtDate(s: string) {
  return s
    ? new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
}

interface JobCardItem {
  id: string
  route: string | null
  revised_date: string
  positions: { position_name: string } | null
}

export default async function BuildingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; buildingId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const [{ id, buildingId }, { tab }] = await Promise.all([params, searchParams])
  const [supabase, role] = await Promise.all([createClient(), getUserRole()])

  const showJobCards = tab === 'jobcards'

  const [{ data: building }, { data: areas }, { data: jobCardsRaw }, { data: taskCodesRaw }, { data: positionsRaw }] = await Promise.all([
    supabase
      .from('buildings')
      .select('*, building_types(type_name), prospects(company_name)')
      .eq('id', buildingId)
      .eq('prospect_id', id)
      .single(),
    showJobCards
      ? Promise.resolve({ data: null })
      : supabase.from('areas').select('*').eq('building_id', buildingId).order('print_order').order('area_name'),
    showJobCards
      ? supabase
          .from('job_cards')
          .select('id, route, revised_date, positions(position_name)')
          .eq('building_id', buildingId)
          .order('revised_date', { ascending: false })
      : Promise.resolve({ data: null }),
    showJobCards
      ? Promise.resolve({ data: null })
      : supabase
          .from('task_codes')
          .select('id, task_code, task_name, position_id, unit_of_measure, production_rate, rate_each, default_basis, description, task_types(type_name)')
          .eq('is_active', true)
          .order('task_code'),
    showJobCards
      ? Promise.resolve({ data: null })
      : supabase.from('positions').select('id, position_name').order('position_name'),
  ])

  if (!building) notFound()

  const isAdmin  = role === 'admin'
  const address  = [building.address, building.address_2, building.city, building.state, building.zip]
    .filter(Boolean)
    .join(', ')
  // Supabase returns the to-one prospect as an object; guard array form defensively.
  const prospectRel  = (building as { prospects?: { company_name: string } | { company_name: string }[] | null }).prospects
  const prospectName = (Array.isArray(prospectRel) ? prospectRel[0]?.company_name : prospectRel?.company_name) ?? ''
  const jobCards = (jobCardsRaw ?? []) as unknown as JobCardItem[]

  return (
    <div className="flex flex-col h-full">
      <Header
        title={building.building_name}
        description={
          prospectName ? (
            <>
              <Link
                href={`/prospects/${id}`}
                className="text-brand-600 hover:text-brand-800 font-medium"
              >
                {prospectName}
              </Link>
              {address && <span className="text-gray-400"> · {address}</span>}
            </>
          ) : (
            address || 'Building details'
          )
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/prospects/${id}`}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              ← Back to Prospect
            </Link>
            <Link
              href={`/prospects/${id}/edit`}
              className="bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Edit Prospect
            </Link>
            <Link
              href={`/prospects/${id}/buildings/${buildingId}/edit`}
              className="bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Edit Building
            </Link>
          </div>
        }
      />

      <BuildingTabNav prospectId={id} buildingId={buildingId} activeTab={tab} />

      <div className="p-6 space-y-6">
        {/* Info Cards — always visible */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Details</h3>
            <dl className="space-y-2">
              <InfoRow label="Building Type" value={(building as BuildingRow).building_types?.type_name} />
              <InfoRow label="Square Feet" value={building.square_feet != null ? building.square_feet.toLocaleString() : null} />
              <InfoRow label="Floors" value={building.floors} />
              <InfoRow label="Service Days" value={building.service_days} />
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Address</h3>
            <dl className="space-y-2">
              <InfoRow label="Street" value={building.address} />
              <InfoRow label="Address 2" value={building.address_2} />
              <InfoRow label="City" value={building.city} />
              <InfoRow label="State / ZIP" value={[building.state, building.zip].filter(Boolean).join(' ') || null} />
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Directions & Notes</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Directions</dt>
                <dd className="mt-0.5 text-sm text-gray-800 whitespace-pre-wrap">{building.directions || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Notes</dt>
                <dd className="mt-0.5 text-sm text-gray-800 whitespace-pre-wrap">{building.notes || '—'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Tab content */}
        {showJobCards ? (
          <div className="space-y-3 max-w-5xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">
                Job Cards
                <span className="ml-2 text-sm font-normal text-gray-400">({jobCards.length})</span>
              </h2>
              {isAdmin && (
                <Link
                  href="/job-cards/new"
                  className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  + New Job Card
                </Link>
              )}
            </div>

            {jobCards.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center">
                <p className="text-sm text-gray-400">No job cards for this building yet.</p>
                {isAdmin && (
                  <Link href="/job-cards/new" className="mt-3 inline-block text-sm text-brand-600 hover:text-brand-800 font-medium">
                    Create the first one →
                  </Link>
                )}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Position</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Route</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Revised</th>
                      <th className="px-4 py-3 w-28" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {jobCards.map(jc => (
                      <tr key={jc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {jc.positions?.position_name ?? <span className="italic text-gray-400">No position</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{jc.route ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 tabular-nums">{fmtDate(jc.revised_date)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Link
                            href={`/job-cards/${jc.id}`}
                            className="text-xs font-medium text-brand-600 hover:text-brand-800"
                          >
                            Edit
                          </Link>
                          <span className="mx-1.5 text-gray-300">|</span>
                          <a
                            href={`/job-cards/${jc.id}/print`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-brand-600 hover:text-brand-800"
                          >
                            Print
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <AreaSpreadsheet
            areas={areas ?? []}
            buildingId={buildingId}
            prospectId={id}
            isAdmin={isAdmin}
            taskCodes={(taskCodesRaw ?? []) as unknown as TaskCodeForForm[]}
            buildingSqFt={building.square_feet ?? null}
            buildingServiceDays={building.service_days}
            positions={positionsRaw ?? []}
          />
        )}
      </div>
    </div>
  )
}
