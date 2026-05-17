import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import LaborCostTypeList from './LaborCostTypeList'

export const metadata = { title: 'Labor Cost Types | CleanBid Pro' }

export default async function LaborCostTypesPage() {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/')

  const supabase = await createClient()
  const { data: items, error } = await supabase
    .from('labor_cost_types')
    .select('*')
    .order('name')

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Labor Cost Types"
        description="Lookup values for Section 2 labor-related cost descriptions"
        actions={
          <Link
            href="/admin/labor-cost-types/new"
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Type
          </Link>
        }
      />
      <div className="p-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            Failed to load labor cost types: {error.message}
          </div>
        ) : (
          <LaborCostTypeList items={items ?? []} />
        )}
      </div>
    </div>
  )
}
