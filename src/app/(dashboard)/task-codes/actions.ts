'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ActionState = { error: string } | null

const VALID_UNITS = ['sqft_per_hour', 'minutes_per_unit'] as const

async function assertAdmin(): Promise<ActionState> {
  const role = await getUserRole()
  if (role !== 'admin') return { error: 'Only admins can manage task codes.' }
  return null
}

function extractTaskCodeData(formData: FormData) {
  const rateStr = (formData.get('production_rate') as string)?.trim()
  return {
    task_code:        (formData.get('task_code') as string).trim().toUpperCase(),
    task_name:        (formData.get('task_name') as string).trim(),
    task_type_id:     (formData.get('task_type_id') as string) || null,
    position_id:      (formData.get('position_id') as string) || null,
    unit_of_measure:  (formData.get('unit_of_measure') as string),
    production_rate:  rateStr ? parseFloat(rateStr) : null,
    description:      (formData.get('description') as string)?.trim() || null,
    description_alt:  (formData.get('description_alt') as string)?.trim() || null,
  }
}

function validateData(data: ReturnType<typeof extractTaskCodeData>): ActionState {
  if (!data.task_code) return { error: 'Task code is required.' }
  if (!data.task_name) return { error: 'Task name is required.' }
  if (!VALID_UNITS.includes(data.unit_of_measure as typeof VALID_UNITS[number])) {
    return { error: 'Unit of measure is required.' }
  }
  if (data.production_rate !== null && (isNaN(data.production_rate) || data.production_rate <= 0)) {
    return { error: 'Production rate must be a positive number.' }
  }
  return null
}

export async function createTaskCode(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const data = extractTaskCodeData(formData)
  const validationError = validateData(data)
  if (validationError) return validationError

  const supabase = await createClient()
  const { error } = await supabase.from('task_codes').insert(data)
  if (error) return { error: error.message }

  revalidatePath('/task-codes')
  redirect('/task-codes')
}

export async function updateTaskCode(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const data = extractTaskCodeData(formData)
  const validationError = validateData(data)
  if (validationError) return validationError

  const supabase = await createClient()
  const { error } = await supabase.from('task_codes').update(data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/task-codes')
  redirect('/task-codes')
}

export async function deleteTaskCode(id: string): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const supabase = await createClient()
  const { error } = await supabase.from('task_codes').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/task-codes')
  return null
}
