import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import TaskCodeForm from '../TaskCodeForm'

export const metadata = { title: 'New Task Code | CleanBid Pro' }

export default async function NewTaskCodePage() {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/task-codes')

  return (
    <div className="flex flex-col h-full">
      <Header
        title="New Task Code"
        description="Define a new cleaning task and unit of measure"
      />
      <div className="p-6 max-w-2xl">
        <TaskCodeForm />
      </div>
    </div>
  )
}
