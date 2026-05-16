import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import TaskCodeForm from '../../TaskCodeForm'

export const metadata = { title: 'Edit Task Code | CleanBid Pro' }

export default async function EditTaskCodePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/task-codes')

  const { id } = await params
  const supabase = await createClient()

  const [{ data: taskCode }, { data: taskTypes }, { data: positions }] = await Promise.all([
    supabase.from('task_codes').select('*').eq('id', id).single(),
    supabase.from('task_types').select('id, type_name').order('type_name'),
    supabase.from('positions').select('id, position_name').order('position_name'),
  ])

  if (!taskCode) notFound()

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Edit: ${taskCode.task_name}`}
        description="Update task code details"
      />
      <div className="p-6 max-w-3xl">
        <TaskCodeForm
          taskCode={taskCode}
          taskTypes={taskTypes ?? []}
          positions={positions ?? []}
        />
      </div>
    </div>
  )
}
