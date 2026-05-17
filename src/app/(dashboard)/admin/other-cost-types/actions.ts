'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ActionState = { error: string } | null

async function assertAdmin(): Promise<ActionState> {
  const role = await getUserRole()
  if (role !== 'admin') return { error: 'Only admins can manage other cost types.' }
  return null
}

function extractData(formData: FormData) {
  return { name: (formData.get('name') as string).trim() }
}

export async function createOtherCostType(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const data = extractData(formData)
  if (!data.name) return { error: 'Name is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('other_cost_types').insert(data)
  if (error) return { error: error.message }

  revalidatePath('/admin/other-cost-types')
  redirect('/admin/other-cost-types')
}

export async function updateOtherCostType(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const data = extractData(formData)
  if (!data.name) return { error: 'Name is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('other_cost_types').update(data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/other-cost-types')
  redirect('/admin/other-cost-types')
}

export async function deleteOtherCostType(id: string): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const supabase = await createClient()
  const { error } = await supabase.from('other_cost_types').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/other-cost-types')
  return null
}
