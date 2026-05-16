import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import TaskCodeForm from '../TaskCodeForm'

export const metadata = { title: 'New Task Code | CleanBid Pro' }

export default async function NewTaskCodePage() {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/task-codes')

  const supabase = await createClient()
  const [{ data: taskTypes }, { data: positions }] = await Promise.all([
    supabase.from('task_types').select('id, type_name').order('type_name'),
    supabase.from('positions').select('id, position_name').order('position_name'),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header
        title="New Task Code"
        description="Define a new cleaning task and production rate"
      />
      <div className="p-6 max-w-3xl">
        <TaskCodeForm
          taskTypes={taskTypes ?? []}
          positions={positions ?? []}
        />
      </div>
    </div>
  )
}
