import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import TaskLineItemForm from '../../TaskLineItemForm'
import type { TaskCodeForForm, TaskLineItem } from '@/types/task-line-item'

export const metadata = { title: 'Edit Task | CleanBid Pro' }

export default async function EditTaskLineItemPage({
  params,
}: {
  params: Promise<{ id: string; buildingId: string; areaId: string; lineItemId: string }>
}) {
  const { id, buildingId, areaId, lineItemId } = await params
  const [role, supabase] = await Promise.all([getUserRole(), createClient()])
  if (!role) notFound()

  const [{ data: item }, { data: area }, { data: taskCodesRaw }, { data: positions }] = await Promise.all([
    supabase
      .from('task_line_items')
      .select('*')
      .eq('id', lineItemId)
      .eq('area_id', areaId)
      .single(),
    supabase
      .from('areas')
      .select('area_name, frequency, square_footage')
      .eq('id', areaId)
      .eq('building_id', buildingId)
      .single(),
    supabase
      .from('task_codes')
      .select('id, task_code, task_name, position_id, unit_of_measure, production_rate, description, task_types(type_name)')
      .order('task_code'),
    supabase
      .from('positions')
      .select('id, position_name')
      .order('position_name'),
  ])

  if (!item || !area) notFound()

  const taskCodes = (taskCodesRaw ?? []) as unknown as TaskCodeForForm[]

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Edit: ${(item as TaskLineItem).task_name}`}
        description={area.area_name}
      />
      <div className="p-6 max-w-3xl">
        <TaskLineItemForm
          item={item as TaskLineItem}
          areaId={areaId}
          buildingId={buildingId}
          prospectId={id}
          taskCodes={taskCodes}
          positions={positions ?? []}
          defaultFrequency={area.frequency}
          defaultQuantity={area.square_footage}
        />
      </div>
    </div>
  )
}
