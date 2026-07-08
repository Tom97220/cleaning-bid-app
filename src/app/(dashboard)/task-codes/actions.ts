'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ActionState = { error: string } | null

const VALID_UNITS = ['sqft_per_hour', 'minutes_per_unit', 'both'] as const
const VALID_BASIS = ['sqft_per_hour', 'minutes_per_unit'] as const

async function assertAdmin(): Promise<ActionState> {
  const role = await getUserRole()
  if (role !== 'admin') return { error: 'Only admins can manage task codes.' }
  return null
}

function extractTaskCodeData(formData: FormData) {
  const rateStr      = (formData.get('production_rate') as string)?.trim()
  const rateEachStr  = (formData.get('rate_each') as string)?.trim()
  const uom          = (formData.get('unit_of_measure') as string)
  const isBoth       = uom === 'both'
  return {
    task_code:        (formData.get('task_code') as string).trim(),
    task_name:        (formData.get('task_name') as string).trim(),
    task_type_id:     (formData.get('task_type_id') as string) || null,
    position_id:      (formData.get('position_id') as string) || null,
    unit_of_measure:  uom,
    production_rate:  rateStr ? parseFloat(rateStr) : null,
    rate_each:        isBoth && rateEachStr ? parseFloat(rateEachStr) : null,
    default_basis:    isBoth ? ((formData.get('default_basis') as string) || null) : null,
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
  if (data.unit_of_measure === 'both') {
    if (!data.production_rate) return { error: 'Sq ft/hour rate is required for Both measure.' }
    if (!data.rate_each || isNaN(data.rate_each) || data.rate_each <= 0) {
      return { error: 'Minutes/each rate is required for Both measure.' }
    }
    if (!data.default_basis || !VALID_BASIS.includes(data.default_basis as typeof VALID_BASIS[number])) {
      return { error: 'Default basis is required for Both measure.' }
    }
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

export async function setTaskCodeActive(id: string, active: boolean): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const supabase = await createClient()
  const { error } = await supabase.from('task_codes').update({ is_active: active }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/task-codes')
  return null
}

export async function deleteTaskCode(id: string): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const supabase = await createClient()

  // Guard: a used code is protected by the RESTRICT FK. Check first so the
  // admin gets a clear message instead of a raw foreign-key error.
  const { count } = await supabase
    .from('task_line_items')
    .select('id', { count: 'exact', head: true })
    .eq('task_code_id', id)
  if (count && count > 0) {
    return { error: 'This code is in use on existing bids — retire it instead of deleting.' }
  }

  const { error } = await supabase.from('task_codes').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/task-codes')
  return null
}
