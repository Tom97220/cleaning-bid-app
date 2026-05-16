import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import TaskCodeList from './TaskCodeList'

export const metadata = { title: 'Task Codes | CleanBid Pro' }

export default async function TaskCodesPage() {
  const [supabase, role] = await Promise.all([
    createClient(),
    getUserRole(),
  ])

  const { data: taskCodes, error } = await supabase
    .from('task_codes')
    .select('*')
    .order('task_code')

  const isAdmin = role === 'admin'

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Task Codes"
        description="Configure cleaning tasks and units of measure"
        actions={
          isAdmin ? (
            <Link
              href="/task-codes/new"
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + New Task Code
            </Link>
          ) : undefined
        }
      />
      <div className="p-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            Failed to load task codes: {error.message}
          </div>
        ) : (
          <TaskCodeList taskCodes={taskCodes ?? []} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  )
}
