'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ActionState = { error: string } | null

async function assertAuthenticated(): Promise<ActionState> {
  const role = await getUserRole()
  if (!role) return { error: 'You must be signed in.' }
  return null
}

async function assertAdmin(): Promise<ActionState> {
  const role = await getUserRole()
  if (role !== 'admin') return { error: 'Only admins can delete areas.' }
  return null
}

function extractAreaData(formData: FormData) {
  const sqftStr  = (formData.get('square_footage') as string)?.trim()
  const freqStr  = (formData.get('frequency') as string)?.trim()
  const orderStr = (formData.get('print_order') as string)?.trim()
  return {
    area_name:      (formData.get('area_name') as string).trim(),
    square_footage: sqftStr  ? parseFloat(sqftStr)    : null,
    frequency:      freqStr  ? parseInt(freqStr, 10)  : null,
    print_order:    orderStr ? parseInt(orderStr, 10) : null,
    notes:          (formData.get('notes') as string)?.trim() || null,
  }
}

function buildingPath(prospectId: string, buildingId: string) {
  return `/prospects/${prospectId}/buildings/${buildingId}`
}

export async function createArea(
  buildingId: string,
  prospectId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authError = await assertAuthenticated()
  if (authError) return authError

  const data = extractAreaData(formData)
  if (!data.area_name) return { error: 'Area name is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('areas').insert({ ...data, building_id: buildingId })
  if (error) return { error: error.message }

  revalidatePath(buildingPath(prospectId, buildingId))
  redirect(buildingPath(prospectId, buildingId))
}

export async function updateArea(
  id: string,
  buildingId: string,
  prospectId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authError = await assertAuthenticated()
  if (authError) return authError

  const data = extractAreaData(formData)
  if (!data.area_name) return { error: 'Area name is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('areas').update(data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(buildingPath(prospectId, buildingId))
  redirect(buildingPath(prospectId, buildingId))
}

export async function deleteArea(
  id: string,
  buildingId: string,
  prospectId: string
): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const supabase = await createClient()
  const { error } = await supabase.from('areas').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(buildingPath(prospectId, buildingId))
  return null
}
