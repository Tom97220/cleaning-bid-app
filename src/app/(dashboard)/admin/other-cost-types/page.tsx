import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import OtherCostTypeList from './OtherCostTypeList'

export const metadata = { title: 'Other Cost Types | CleanBid Pro' }

export default async function OtherCostTypesPage() {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/')

  const supabase = await createClient()
  const { data: items, error } = await supabase
    .from('other_cost_types')
    .select('*')
    .order('name')

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Other Cost Types"
        description="Lookup values for Section 3 other direct cost descriptions"
        actions={
          <Link
            href="/admin/other-cost-types/new"
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Type
          </Link>
        }
      />
      <div className="p-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            Failed to load other cost types: {error.message}
          </div>
        ) : (
          <OtherCostTypeList items={items ?? []} />
        )}
      </div>
    </div>
  )
}
