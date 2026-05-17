import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import AreaList from './areas/AreaList'

export const metadata = { title: 'Building | CleanBid Pro' }

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">{value ?? '—'}</dd>
    </div>
  )
}

export default async function BuildingDetailPage({
  params,
}: {
  params: Promise<{ id: string; buildingId: string }>
}) {
  const { id, buildingId } = await params
  const [supabase, role] = await Promise.all([createClient(), getUserRole()])

  const [{ data: building }, { data: areas }] = await Promise.all([
    supabase
      .from('buildings')
      .select('*, building_types(type_name)')
      .eq('id', buildingId)
      .eq('prospect_id', id)
      .single(),
    supabase
      .from('areas')
      .select('*')
      .eq('building_id', buildingId)
      .order('print_order')
      .order('area_name'),
  ])

  if (!building) notFound()

  const isAdmin = role === 'admin'
  const address = [building.address, building.address_2, building.city, building.state, building.zip]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="flex flex-col h-full">
      <Header
        title={building.building_name}
        description={address || 'Building details'}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/prospects/${id}`}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              ← Back to Prospect
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

      <div className="p-6 space-y-6 max-w-5xl">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Details</h3>
            <dl className="space-y-2">
              <InfoRow label="Building Type" value={(building as any).building_types?.type_name} />
              <InfoRow label="Square Feet" value={building.square_feet != null ? building.square_feet.toLocaleString() : null} />
              <InfoRow label="Floors" value={building.floors} />
            </dl>
          </div>

          {/* Address */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Address</h3>
            <dl className="space-y-2">
              <InfoRow label="Street" value={building.address} />
              <InfoRow label="Address 2" value={building.address_2} />
              <InfoRow label="City" value={building.city} />
              <InfoRow label="State / ZIP" value={[building.state, building.zip].filter(Boolean).join(' ') || null} />
            </dl>
          </div>

          {/* Directions & Notes */}
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

        {/* Areas */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-800">
            Areas
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({areas?.length ?? 0})
            </span>
          </h2>
          <AreaList
            areas={areas ?? []}
            buildingId={buildingId}
            prospectId={id}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  )
}
