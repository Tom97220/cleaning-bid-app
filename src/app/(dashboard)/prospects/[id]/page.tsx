import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import BuildingList from './buildings/BuildingList'

export const metadata = { title: 'Prospect | CleanBid Pro' }

const TYPE_LABELS: Record<string, string> = {
  commercial:  'Commercial',
  industrial:  'Industrial',
  medical:     'Medical',
  educational: 'Educational',
  other:       'Other',
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">{value || '—'}</dd>
    </div>
  )
}

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [supabase, role] = await Promise.all([createClient(), getUserRole()])

  const [{ data: prospect }, { data: buildings }] = await Promise.all([
    supabase.from('prospects').select('*').eq('id', id).single(),
    supabase
      .from('buildings')
      .select('*, building_types(type_name)')
      .eq('prospect_id', id)
      .order('building_name'),
  ])

  if (!prospect) notFound()

  const isAdmin = role === 'admin'

  return (
    <div className="flex flex-col h-full">
      <Header
        title={prospect.company_name}
        description={
          [TYPE_LABELS[prospect.prospect_type ?? ''], prospect.city, prospect.state]
            .filter(Boolean)
            .join(' · ') || 'Prospect details'
        }
        actions={
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              prospect.status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {prospect.status === 'active' ? 'Active' : 'Inactive'}
            </span>
            <Link
              href={`/prospects/${id}/edit`}
              className="bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Edit Prospect
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-5xl">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Contact */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact</h3>
            <dl className="space-y-2">
              <InfoRow label="Name" value={prospect.contact_name} />
              <InfoRow label="Title" value={prospect.contact_title} />
              <InfoRow label="Phone" value={prospect.phone} />
              <InfoRow label="Email" value={prospect.email} />
            </dl>
          </div>

          {/* Address */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Address</h3>
            <dl className="space-y-2">
              <InfoRow label="Street" value={prospect.address} />
              <InfoRow label="City" value={prospect.city} />
              <InfoRow label="State" value={prospect.state} />
              <InfoRow label="ZIP" value={prospect.zip} />
            </dl>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Notes</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {prospect.notes || <span className="text-gray-400 italic">No notes</span>}
            </p>
          </div>
        </div>

        {/* Buildings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">
              Buildings
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({buildings?.length ?? 0})
              </span>
            </h2>
          </div>
          <BuildingList
            buildings={buildings ?? []}
            prospectId={id}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  )
}
