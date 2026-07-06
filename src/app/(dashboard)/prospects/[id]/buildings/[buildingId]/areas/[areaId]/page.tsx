import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import { formatFrequency } from '@/types/area'
import TaskLineItemList from './task-line-items/TaskLineItemList'
import type { TaskLineItemRow } from '@/types/task-line-item'

export const metadata = { title: 'Area | CleanBid Pro' }

function InfoChip({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">{value ?? '—'}</dd>
    </div>
  )
}

export default async function AreaDetailPage({
  params,
}: {
  params: Promise<{ id: string; buildingId: string; areaId: string }>
}) {
  const { id, buildingId, areaId } = await params
  const [supabase, role] = await Promise.all([createClient(), getUserRole()])
  if (!role) notFound()

  const [{ data: area }, { data: lineItemsRaw }] = await Promise.all([
    supabase
      .from('areas')
      .select('*')
      .eq('id', areaId)
      .eq('building_id', buildingId)
      .single(),
    supabase
      .from('task_line_items')
      .select('*, task_codes(task_code, description), positions(position_name)')
      .eq('area_id', areaId)
      .order('created_at'),
  ])

  if (!area) notFound()

  const totalSqft    = (area.carpet_sqft ?? 0) + (area.tile_vct_sqft ?? 0) + (area.other_sqft ?? 0)
  const hasTotalSqft = area.carpet_sqft != null || area.tile_vct_sqft != null || area.other_sqft != null

  const lineItems = (lineItemsRaw ?? []) as unknown as TaskLineItemRow[]

  return (
    <div className="flex flex-col h-full">
      <Header
        title={area.area_name}
        description="Area details"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/prospects/${id}/buildings/${buildingId}`}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              ← Back to Building
            </Link>
            <Link
              href={`/prospects/${id}/buildings/${buildingId}/areas/${areaId}/edit`}
              className="bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Edit Area
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-5xl">
        {/* Area Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Details</h3>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoChip label="Room Count"       value={area.room_count} />
            <InfoChip label="Carpet Sq Ft"     value={area.carpet_sqft != null ? area.carpet_sqft.toLocaleString() : null} />
            <InfoChip label="Tile / VCT Sq Ft" value={area.tile_vct_sqft != null ? area.tile_vct_sqft.toLocaleString() : null} />
            <InfoChip label="Other Sq Ft"      value={area.other_sqft != null ? area.other_sqft.toLocaleString() : null} />
            <InfoChip label="Total Sq Ft"      value={hasTotalSqft ? totalSqft.toLocaleString() : null} />
            <InfoChip label="Square Footage"   value={area.square_footage != null ? area.square_footage.toLocaleString() : null} />
            <InfoChip label="Fixtures"         value={area.fixtures} />
            <InfoChip label="Frequency"        value={formatFrequency(area.frequency)} />
            <InfoChip label="Print Order"      value={area.print_order} />
            <InfoChip label="Notes"            value={area.notes} />
          </dl>
        </div>

        {/* Task Line Items */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-800">
            Tasks
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({lineItems.length})
            </span>
          </h2>
          <TaskLineItemList
            items={lineItems}
            areaId={areaId}
            buildingId={buildingId}
            prospectId={id}
          />
        </div>
      </div>
    </div>
  )
}
