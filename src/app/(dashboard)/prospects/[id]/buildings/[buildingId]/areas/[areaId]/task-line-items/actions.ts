'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { calculateHours, resolveAreaEffectiveFrequency, deriveFrequencySource, type TaskLineItem, type TaskLineItemRow } from '@/types/task-line-item'

export type ActionState = { error: string } | null

// A task's parent is its area; the area's effective frequency (area override,
// else the building's service_days) is what the task inherits. Fetch both so
// create/edit can mark the task 'override' only when the entered frequency
// differs from that value.
async function areaEffectiveFrequency(
  supabase: Awaited<ReturnType<typeof createClient>>,
  areaId: string,
  buildingId: string,
): Promise<number> {
  const [{ data: building }, { data: area }] = await Promise.all([
    supabase.from('buildings').select('service_days').eq('id', buildingId).single(),
    supabase.from('areas').select('frequency, frequency_source').eq('id', areaId).single(),
  ])
  const serviceDays = building?.service_days ?? 260
  if (!area) return serviceDays
  return resolveAreaEffectiveFrequency(
    { frequency: area.frequency, frequency_source: area.frequency_source as 'inherited' | 'override' },
    serviceDays,
  )
}

async function assertAuthenticated(): Promise<ActionState> {
  const role = await getUserRole()
  if (!role) return { error: 'You must be signed in.' }
  return null
}

function str(fd: FormData, key: string): string | null {
  return (fd.get(key) as string)?.trim() || null
}

function num(fd: FormData, key: string): number | null {
  const v = (fd.get(key) as string)?.trim()
  return v ? parseFloat(v) : null
}

function extractData(formData: FormData) {
  const freqRaw  = (formData.get('frequency') as string)?.trim()
  const frequency = freqRaw ? parseInt(freqRaw, 10) : null
  const quantity  = num(formData, 'quantity')
  const minutes   = num(formData, 'minutes')
  const percentRaw = num(formData, 'percent')
  const percent   = percentRaw ?? 100
  const measure   = str(formData, 'measure')

  const hours = calculateHours(measure, quantity, minutes, frequency, percent)

  return {
    task_code_id: str(formData, 'task_code_id'),
    task_name:    (formData.get('task_name') as string)?.trim(),
    position_id:  str(formData, 'position_id'),
    frequency,
    percent,
    quantity,
    minutes,
    print:        formData.get('print') !== 'false',
    measure,
    type:         str(formData, 'type'),
    ...hours,
  }
}

function areaPath(prospectId: string, buildingId: string, areaId: string) {
  return `/prospects/${prospectId}/buildings/${buildingId}/areas/${areaId}`
}

export async function createTaskLineItem(
  areaId: string,
  buildingId: string,
  prospectId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await assertAuthenticated()
  if (authError) return authError

  const data = extractData(formData)
  if (!data.task_name) return { error: 'Task name is required.' }

  const supabase = await createClient()
  const frequency_source = deriveFrequencySource(data.frequency, await areaEffectiveFrequency(supabase, areaId, buildingId))
  const { error } = await supabase.from('task_line_items').insert({ ...data, area_id: areaId, frequency_source })
  if (error) return { error: error.message }

  revalidatePath(areaPath(prospectId, buildingId, areaId))
  redirect(areaPath(prospectId, buildingId, areaId))
}

export async function updateTaskLineItem(
  id: string,
  areaId: string,
  buildingId: string,
  prospectId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await assertAuthenticated()
  if (authError) return authError

  const data = extractData(formData)
  if (!data.task_name) return { error: 'Task name is required.' }

  const supabase = await createClient()
  const frequency_source = deriveFrequencySource(data.frequency, await areaEffectiveFrequency(supabase, areaId, buildingId))
  const { error } = await supabase.from('task_line_items').update({ ...data, frequency_source }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(areaPath(prospectId, buildingId, areaId))
  redirect(areaPath(prospectId, buildingId, areaId))
}

export async function deleteTaskLineItem(
  id: string,
  areaId: string,
  buildingId: string,
  prospectId: string,
): Promise<ActionState> {
  const role = await getUserRole()
  if (!role) return { error: 'You must be signed in.' }

  const supabase = await createClient()
  const { error } = await supabase.from('task_line_items').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(areaPath(prospectId, buildingId, areaId))
  return null
}

export type InlineTaskData = {
  task_code_id: string | null
  task_name:    string
  position_id:  string | null
  frequency:    number | null
  frequency_source: 'inherited' | 'override'
  percent:      number
  quantity:     number | null
  minutes:      number | null
  measure:      string | null
  type:         string | null
}

export async function createTaskLineItemInline(
  areaId: string,
  data:   InlineTaskData,
): Promise<{ row: TaskLineItemRow | null; error: string | null }> {
  const role = await getUserRole()
  if (!role) return { row: null, error: 'You must be signed in.' }

  const hours = calculateHours(data.measure, data.quantity, data.minutes, data.frequency, data.percent)

  const supabase = await createClient()
  const { data: inserted, error } = await supabase
    .from('task_line_items')
    .insert({ ...data, area_id: areaId, ...hours })
    .select('*, task_codes(task_code, description), positions(position_name)')
    .single()

  if (error) {
    if (error.code === '23505') return { row: null, error: 'Task code already exists in this area.' }
    return { row: null, error: error.message }
  }
  return { row: inserted as unknown as TaskLineItemRow, error: null }
}

export type TaskLineItemPatch = Partial<Pick<TaskLineItem,
  | 'task_code_id' | 'task_name' | 'position_id'
  | 'frequency' | 'frequency_source' | 'percent' | 'quantity' | 'minutes' | 'measure'
>>

export async function updateTaskLineItemField(
  id: string,
  patch: TaskLineItemPatch,
): Promise<{ row: TaskLineItemRow | null; error: string | null }> {
  const role = await getUserRole()
  if (!role) return { row: null, error: 'You must be signed in.' }

  const hourFields = ['quantity', 'minutes', 'frequency', 'percent', 'measure'] as const
  const needsRecalc = hourFields.some(k => k in patch)

  const supabase = await createClient()
  let updateData: Record<string, unknown> = { ...patch }

  if (needsRecalc) {
    const { data: current, error: fetchError } = await supabase
      .from('task_line_items')
      .select('measure, quantity, minutes, frequency, percent')
      .eq('id', id)
      .single()
    if (fetchError || !current) return { row: null, error: fetchError?.message ?? 'Task not found.' }

    const merged = { ...current, ...patch }
    const pct   = patch.percent ?? current.percent
    const hours = calculateHours(
      merged.measure   ?? null,
      merged.quantity  ?? null,
      merged.minutes   ?? null,
      merged.frequency ?? null,
      pct,
    )
    updateData = { ...updateData, ...hours }
  }

  const { data: updated, error } = await supabase
    .from('task_line_items')
    .update(updateData)
    .eq('id', id)
    .select('*, task_codes(task_code, description), positions(position_name)')
    .single()

  if (error) {
    if (error.code === '23505') return { row: null, error: 'Task code already exists in this area.' }
    return { row: null, error: error.message }
  }
  return { row: updated as unknown as TaskLineItemRow, error: null }
}
