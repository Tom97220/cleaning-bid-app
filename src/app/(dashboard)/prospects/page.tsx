import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import ProspectList from './ProspectList'

export const metadata = { title: 'Prospect Master File | CleanBid Pro' }

export default async function ProspectsPage() {
  const [supabase, role] = await Promise.all([
    createClient(),
    getUserRole(),
  ])

  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('*')
    .order('company_name')

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Prospect Master File"
        description="Manage prospect accounts, contacts, and facility information"
        actions={
          <Link
            href="/prospects/new"
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Prospect
          </Link>
        }
      />
      <div className="p-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            Failed to load prospects: {error.message}
          </div>
        ) : (
          <ProspectList
            prospects={prospects ?? []}
            canDelete={role === 'admin'}
          />
        )}
      </div>
    </div>
  )
}
