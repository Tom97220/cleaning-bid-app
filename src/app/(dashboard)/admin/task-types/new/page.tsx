import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import TaskTypeForm from '../TaskTypeForm'

export const metadata = { title: 'New Task Type | CleanBid Pro' }

export default async function NewTaskTypePage() {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/')

  return (
    <div className="flex flex-col h-full">
      <Header
        title="New Task Type"
        description="Add a task type lookup value"
      />
      <div className="p-6 max-w-2xl">
        <TaskTypeForm />
      </div>
    </div>
  )
}
