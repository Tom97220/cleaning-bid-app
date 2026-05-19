import Link from 'next/link'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import ProspectList from './ProspectList'

export const metadata = { title: 'Prospect Master File | CleanBid Pro' }

export default async function ProspectsPage() {
  const role = await getUserRole()

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header
        title="Prospect Master File"
        description="Search prospects and buildings"
        actions={
          role === 'admin' ? (
            <Link
              href="/prospects/new"
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + New Prospect
            </Link>
          ) : undefined
        }
      />
      <div className="p-6">
        <ProspectList />
      </div>
    </div>
  )
}
