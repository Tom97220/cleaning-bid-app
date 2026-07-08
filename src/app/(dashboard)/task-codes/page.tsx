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

  const [{ data: taskCodes, error }, { data: usedRows }] = await Promise.all([
    supabase
      .from('task_codes')
      .select('*, task_types(type_name), positions(position_name)')
      .order('task_code'),
    supabase.from('task_line_items').select('task_code_id'),
  ])

  // Distinct set of codes referenced by at least one line item — the row-level
  // Delete control is shown only for codes NOT in this set (safe hard delete).
  const usedCodeIds = Array.from(
    new Set((usedRows ?? []).map((r) => r.task_code_id).filter(Boolean))
  ) as string[]

  const isAdmin = role === 'admin'

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Task Codes"
        description="Configure cleaning tasks and production rates"
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
          <TaskCodeList taskCodes={taskCodes ?? []} isAdmin={isAdmin} usedCodeIds={usedCodeIds} />
        )}
      </div>
    </div>
  )
}
