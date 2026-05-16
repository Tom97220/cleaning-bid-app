'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ActionState = { error: string } | null

async function assertAdmin(): Promise<ActionState> {
  const role = await getUserRole()
  if (role !== 'admin') return { error: 'Only admins can manage positions.' }
  return null
}

function extractPositionData(formData: FormData) {
  return {
    position_code: (formData.get('position_code') as string).trim().toUpperCase(),
    position_name: (formData.get('position_name') as string).trim(),
    description:   (formData.get('description')   as string)?.trim() || null,
  }
}

export async function createPosition(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const data = extractPositionData(formData)
  if (!data.position_code) return { error: 'Position code is required.' }
  if (!data.position_name) return { error: 'Position name is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('positions').insert(data)
  if (error) return { error: error.message }

  revalidatePath('/positions')
  redirect('/positions')
}

export async function updatePosition(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const data = extractPositionData(formData)
  if (!data.position_code) return { error: 'Position code is required.' }
  if (!data.position_name) return { error: 'Position name is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('positions').update(data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/positions')
  redirect('/positions')
}

export async function deletePosition(id: string): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const supabase = await createClient()
  const { error } = await supabase.from('positions').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/positions')
  return null
}
