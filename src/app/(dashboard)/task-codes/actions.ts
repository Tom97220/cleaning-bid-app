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
  return {
    task_code:       (formData.get('task_code') as string).trim().toUpperCase(),
    task_name:       (formData.get('task_name') as string).trim(),
    description:     (formData.get('description') as string)?.trim() || null,
    unit_of_measure: (formData.get('unit_of_measure') as string),
  }
}

export async function createTaskCode(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const data = extractTaskCodeData(formData)
  if (!data.task_code) return { error: 'Task code is required.' }
  if (!data.task_name) return { error: 'Task name is required.' }
  if (!VALID_UNITS.includes(data.unit_of_measure as typeof VALID_UNITS[number])) {
    return { error: 'Unit of measure is required.' }
  }

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
  if (!data.task_code) return { error: 'Task code is required.' }
  if (!data.task_name) return { error: 'Task name is required.' }
  if (!VALID_UNITS.includes(data.unit_of_measure as typeof VALID_UNITS[number])) {
    return { error: 'Unit of measure is required.' }
  }

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
