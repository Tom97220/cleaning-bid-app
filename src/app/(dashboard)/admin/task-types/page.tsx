import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import TaskTypeList from './TaskTypeList'

export const metadata = { title: 'Task Types | CleanBid Pro' }

export default async function TaskTypesPage() {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/')

  const supabase = await createClient()
  const { data: taskTypes, error } = await supabase
    .from('task_types')
    .select('*')
    .order('type_name')

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Task Types"
        description="Lookup values used to categorize task codes"
        actions={
          <Link
            href="/admin/task-types/new"
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Task Type
          </Link>
        }
      />
      <div className="p-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            Failed to load task types: {error.message}
          </div>
        ) : (
          <TaskTypeList taskTypes={taskTypes ?? []} />
        )}
      </div>
    </div>
  )
}
