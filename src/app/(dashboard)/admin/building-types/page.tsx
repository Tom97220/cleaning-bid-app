import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import BuildingTypeList from './BuildingTypeList'

export const metadata = { title: 'Building Types | CleanBid Pro' }

export default async function BuildingTypesPage() {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/')

  const supabase = await createClient()
  const { data: buildingTypes, error } = await supabase
    .from('building_types')
    .select('*')
    .order('type_name')

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Building Types"
        description="Lookup values used to categorize buildings"
        actions={
          <Link
            href="/admin/building-types/new"
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Building Type
          </Link>
        }
      />
      <div className="p-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            Failed to load building types: {error.message}
          </div>
        ) : (
          <BuildingTypeList buildingTypes={buildingTypes ?? []} />
        )}
      </div>
    </div>
  )
}
