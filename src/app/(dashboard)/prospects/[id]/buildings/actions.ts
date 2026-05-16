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
  if (role !== 'admin') return { error: 'Only admins can delete buildings.' }
  return null
}

function extractBuildingData(formData: FormData) {
  const sqftStr   = (formData.get('square_feet') as string)?.trim()
  const floorsStr = (formData.get('floors') as string)?.trim()
  return {
    building_name:    (formData.get('building_name') as string).trim(),
    address:          (formData.get('address') as string)?.trim() || null,
    city:             (formData.get('city') as string)?.trim() || null,
    state:            (formData.get('state') as string)?.trim() || null,
    zip:              (formData.get('zip') as string)?.trim() || null,
    building_type_id: (formData.get('building_type_id') as string) || null,
    square_feet:      sqftStr   ? parseFloat(sqftStr)     : null,
    floors:           floorsStr ? parseInt(floorsStr, 10) : null,
    notes:            (formData.get('notes') as string)?.trim() || null,
    directions:       (formData.get('directions') as string)?.trim() || null,
  }
}

export async function createBuilding(
  prospectId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authError = await assertAuthenticated()
  if (authError) return authError

  const data = extractBuildingData(formData)
  if (!data.building_name) return { error: 'Building name is required.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('buildings')
    .insert({ ...data, prospect_id: prospectId })
  if (error) return { error: error.message }

  revalidatePath(`/prospects/${prospectId}`)
  redirect(`/prospects/${prospectId}`)
}

export async function updateBuilding(
  id: string,
  prospectId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authError = await assertAuthenticated()
  if (authError) return authError

  const data = extractBuildingData(formData)
  if (!data.building_name) return { error: 'Building name is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('buildings').update(data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(`/prospects/${prospectId}`)
  redirect(`/prospects/${prospectId}`)
}

export async function deleteBuilding(
  id: string,
  prospectId: string
): Promise<ActionState> {
  const authError = await assertAdmin()
  if (authError) return authError

  const supabase = await createClient()
  const { error } = await supabase.from('buildings').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(`/prospects/${prospectId}`)
  return null
}
