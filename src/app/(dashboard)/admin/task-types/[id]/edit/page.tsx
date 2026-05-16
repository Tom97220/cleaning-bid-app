import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import TaskTypeForm from '../../TaskTypeForm'

export const metadata = { title: 'Edit Task Type | CleanBid Pro' }

export default async function EditTaskTypePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/')

  const { id } = await params
  const supabase = await createClient()

  const { data: taskType } = await supabase
    .from('task_types')
    .select('*')
    .eq('id', id)
    .single()

  if (!taskType) notFound()

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Edit: ${taskType.type_name}`}
        description="Update task type details"
      />
      <div className="p-6 max-w-2xl">
        <TaskTypeForm taskType={taskType} />
      </div>
    </div>
  )
}
