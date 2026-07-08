import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import TaskLineItemForm from '../TaskLineItemForm'
import type { TaskCodeForForm } from '@/types/task-line-item'

export const metadata = { title: 'Add Task | CleanBid Pro' }

export default async function NewTaskLineItemPage({
  params,
}: {
  params: Promise<{ id: string; buildingId: string; areaId: string }>
}) {
  const { id, buildingId, areaId } = await params
  const [role, supabase] = await Promise.all([getUserRole(), createClient()])
  if (!role) notFound()

  const [{ data: area }, { data: buildingRow }, { data: taskCodesRaw }, { data: positions }] = await Promise.all([
    supabase
      .from('areas')
      .select('area_name, frequency, square_footage, carpet_sqft, tile_vct_sqft, other_sqft')
      .eq('id', areaId)
      .eq('building_id', buildingId)
      .single(),
    supabase.from('buildings').select('service_days').eq('id', buildingId).single(),
    supabase
      .from('task_codes')
      .select('id, task_code, task_name, position_id, unit_of_measure, production_rate, rate_each, default_basis, description, task_types(type_name)')
      .eq('is_active', true)
      .order('task_code'),
    supabase
      .from('positions')
      .select('id, position_name')
      .order('position_name'),
  ])

  if (!area) notFound()

  const hasSqftBreakdown = area.carpet_sqft != null || area.tile_vct_sqft != null || area.other_sqft != null
  const defaultQuantity = hasSqftBreakdown
    ? (area.carpet_sqft ?? 0) + (area.tile_vct_sqft ?? 0) + (area.other_sqft ?? 0)
    : area.square_footage ?? null

  const taskCodes = (taskCodesRaw ?? []) as unknown as TaskCodeForForm[]

  return (
    <div className="flex flex-col h-full">
      <Header title="Add Task" description={area.area_name} />
      <div className="p-6 max-w-3xl">
        <TaskLineItemForm
          areaId={areaId}
          buildingId={buildingId}
          prospectId={id}
          taskCodes={taskCodes}
          positions={positions ?? []}
          defaultFrequency={buildingRow?.service_days ?? 260}
          defaultQuantity={defaultQuantity}
        />
      </div>
    </div>
  )
}
