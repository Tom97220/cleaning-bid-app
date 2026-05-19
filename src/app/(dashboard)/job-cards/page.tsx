import Link from 'next/link'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import JobCardsListView from './JobCardsListView'

export const metadata = { title: 'Job Cards | CleanBid Pro' }

export default async function JobCardsPage() {
  const role = await getUserRole()

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header
        title="Job Cards"
        description="Search prospects and buildings to find or create job cards"
        actions={
          role === 'admin' ? (
            <Link
              href="/job-cards/new"
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + New Job Card
            </Link>
          ) : undefined
        }
      />
      <div className="flex-1 p-6">
        <JobCardsListView />
      </div>
    </div>
  )
}
