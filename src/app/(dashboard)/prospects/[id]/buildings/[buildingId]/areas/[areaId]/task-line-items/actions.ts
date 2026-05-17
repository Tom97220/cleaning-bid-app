'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { calculateHours } from '@/types/task-line-item'

export type ActionState = { error: string } | null

async function assertAuthenticated(): Promise<ActionState> {
  const role = await getUserRole()
  if (!role) return { error: 'You must be signed in.' }
  return null
}

async function assertAdmin(): Promise<ActionState> {
  const role = await getUserRole()
  if (role !== 'admin') return { error: 'Only admins can delete task line items.' }
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
  const { error } = await supabase.from('task_line_items').insert({ ...data, area_id: areaId })
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
  const { error } = await supabase.from('task_line_items').update(data).eq('id', id)
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
  const authError = await assertAdmin()
  if (authError) return authError

  const supabase = await createClient()
  const { error } = await supabase.from('task_line_items').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(areaPath(prospectId, buildingId, areaId))
  return null
}
