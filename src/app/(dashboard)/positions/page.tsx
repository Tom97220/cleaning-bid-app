import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import PositionList from './PositionList'

export const metadata = { title: 'Position Descriptions | CleanBid Pro' }

export default async function PositionsPage() {
  const [supabase, role] = await Promise.all([
    createClient(),
    getUserRole(),
  ])

  const { data: positions, error } = await supabase
    .from('positions')
    .select('*')
    .order('position_code')

  const isAdmin = role === 'admin'

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Position Descriptions"
        description="Define cleaning positions, shift types, and base hourly rates"
        actions={
          isAdmin ? (
            <Link
              href="/positions/new"
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + New Position
            </Link>
          ) : undefined
        }
      />
      <div className="p-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            Failed to load positions: {error.message}
          </div>
        ) : (
          <PositionList positions={positions ?? []} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  )
}
