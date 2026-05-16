'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ActionState = { error: string } | null

async function assertAdmin(): Promise<ActionState> {
  const role = await getUserRole()
  if (role !== 'admin') return { error: 'Only admins can manage building types.' }
  return null
}

function extractData(formData: FormData) {
  return {
    type_name: (formData.get('type_name') as string).trim(),
  }
}

export async function createBuildingType(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const data = extractData(formData)
  if (!data.type_name) return { error: 'Type name is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('building_types').insert(data)
  if (error) return { error: error.message }

  revalidatePath('/admin/building-types')
  redirect('/admin/building-types')
}

export async function updateBuildingType(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const data = extractData(formData)
  if (!data.type_name) return { error: 'Type name is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('building_types').update(data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/building-types')
  redirect('/admin/building-types')
}

export async function deleteBuildingType(id: string): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const supabase = await createClient()
  const { error } = await supabase.from('building_types').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/building-types')
  return null
}
