import { getCurrentUserWithRole } from '@/lib/supabase/auth'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role } = await getCurrentUserWithRole()

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userEmail={user?.email} role={role ?? 'user'} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
