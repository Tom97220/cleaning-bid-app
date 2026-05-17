import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import BuildingTabNav from '../BuildingTabNav'
import BidView from './BidView'
import type { BidLaborLineRow, BidLaborCost, BidOtherCost, BidSummary } from '@/types/bid'

export const metadata = { title: 'Bid | CleanBid Pro' }

export default async function BidPage({
  params,
}: {
  params: Promise<{ id: string; buildingId: string }>
}) {
  const { id, buildingId } = await params
  const [supabase, role] = await Promise.all([createClient(), getUserRole()])
  if (!role) notFound()

  const [
    { data: building },
    { data: laborLinesRaw },
    { data: laborCosts },
    { data: otherCosts },
    { data: summary },
    { data: positions },
    { data: laborCostTypes },
    { data: otherCostTypes },
  ] = await Promise.all([
    supabase
      .from('buildings')
      .select('building_name, address, address_2, city, state, zip, square_feet')
      .eq('id', buildingId)
      .eq('prospect_id', id)
      .single(),
    supabase
      .from('bid_labor_lines')
      .select('*, positions(position_name)')
      .eq('building_id', buildingId)
      .order('sort_order', { nullsFirst: false })
      .order('created_at'),
    supabase
      .from('bid_labor_costs')
      .select('*')
      .eq('building_id', buildingId)
      .order('sort_order', { nullsFirst: false })
      .order('created_at'),
    supabase
      .from('bid_other_costs')
      .select('*')
      .eq('building_id', buildingId)
      .order('sort_order', { nullsFirst: false })
      .order('created_at'),
    supabase
      .from('bid_summary')
      .select('*')
      .eq('building_id', buildingId)
      .maybeSingle(),
    supabase
      .from('positions')
      .select('id, position_name')
      .order('position_name'),
    supabase
      .from('labor_cost_types')
      .select('name')
      .order('name'),
    supabase
      .from('other_cost_types')
      .select('name')
      .order('name'),
  ])

  if (!building) notFound()

  const isAdmin  = role === 'admin'
  const address  = [building.address, building.address_2, building.city, building.state, building.zip]
    .filter(Boolean).join(', ')
  const laborLines = (laborLinesRaw ?? []) as unknown as BidLaborLineRow[]

  return (
    <div className="flex flex-col h-full">
      <Header
        title={building.building_name}
        description={address || 'Building bid'}
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

      <BuildingTabNav prospectId={id} buildingId={buildingId} />

      <div className="flex-1 overflow-auto">
        <BidView
          laborLines={laborLines}
          laborCosts={(laborCosts ?? []) as BidLaborCost[]}
          otherCosts={(otherCosts ?? []) as BidOtherCost[]}
          summary={summary as BidSummary | null}
          buildingId={buildingId}
          prospectId={id}
          sqft={building.square_feet}
          isAdmin={isAdmin}
          positions={(positions ?? []) as { id: string; position_name: string }[]}
          laborCostTypeNames={(laborCostTypes ?? []).map((t) => t.name)}
          otherCostTypeNames={(otherCostTypes ?? []).map((t) => t.name)}
        />
      </div>
    </div>
  )
}
