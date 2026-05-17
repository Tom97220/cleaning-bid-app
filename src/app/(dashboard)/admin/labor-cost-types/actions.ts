'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ActionState = { error: string } | null

async function assertAdmin(): Promise<ActionState> {
  const role = await getUserRole()
  if (role !== 'admin') return { error: 'Only admins can manage labor cost types.' }
  return null
}

function extractData(formData: FormData) {
  return { name: (formData.get('name') as string).trim() }
}

export async function createLaborCostType(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const data = extractData(formData)
  if (!data.name) return { error: 'Name is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('labor_cost_types').insert(data)
  if (error) return { error: error.message }

  revalidatePath('/admin/labor-cost-types')
  redirect('/admin/labor-cost-types')
}

export async function updateLaborCostType(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const data = extractData(formData)
  if (!data.name) return { error: 'Name is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('labor_cost_types').update(data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/labor-cost-types')
  redirect('/admin/labor-cost-types')
}

export async function deleteLaborCostType(id: string): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const supabase = await createClient()
  const { error } = await supabase.from('labor_cost_types').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/labor-cost-types')
  return null
}
