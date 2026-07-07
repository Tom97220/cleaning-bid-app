'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { resolveAreaEffectiveFrequency } from '@/types/task-line-item'

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
  const sdStr     = (formData.get('service_days') as string)?.trim()
  const commonStr = (formData.get('common_sqft') as string)?.trim()
  const restStr   = (formData.get('num_restrooms') as string)?.trim()
  const elevStr   = (formData.get('num_elevators') as string)?.trim()
  const stairStr  = (formData.get('num_stairwells') as string)?.trim()
  return {
    building_name:    (formData.get('building_name') as string).trim(),
    address:          (formData.get('address') as string)?.trim() || null,
    address_2:        (formData.get('address_2') as string)?.trim() || null,
    city:             (formData.get('city') as string)?.trim() || null,
    state:            (formData.get('state') as string)?.trim() || null,
    zip:              (formData.get('zip') as string)?.trim() || null,
    building_type_id: (formData.get('building_type_id') as string) || null,
    square_feet:      sqftStr   ? parseFloat(sqftStr)     : null,
    floors:           floorsStr ? parseInt(floorsStr, 10) : null,
    common_sqft:      commonStr ? parseFloat(commonStr)   : null,
    num_restrooms:    restStr   ? parseInt(restStr, 10)   : null,
    num_elevators:    elevStr   ? parseInt(elevStr, 10)   : null,
    num_stairwells:   stairStr  ? parseInt(stairStr, 10)  : null,
    service_days:     sdStr ? parseInt(sdStr, 10) : 260,
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

  const { data: existing } = await supabase
    .from('buildings').select('service_days').eq('id', id).single()

  const { error } = await supabase.from('buildings').update(data).eq('id', id)
  if (error) return { error: error.message }

  if (existing && existing.service_days !== data.service_days) {
    const cascadeError = await cascadeServiceDays(supabase, id, data.service_days)
    if (cascadeError) return { error: cascadeError }
  }

  revalidatePath(`/prospects/${prospectId}`)
  redirect(`/prospects/${prospectId}`)
}

// When a building's service_days changes, cascade the new value down the
// inherit/override chain, driven entirely off frequency_source markers (never
// value-matching, never flipping a marker):
//   (a) inherited areas follow the building's new service_days;
//   (b) inherited tasks follow their area's effective frequency — the area's
//       own value for an override area, else the new service_days.
// Override rows at either level are left untouched.
async function cascadeServiceDays(
  supabase: Awaited<ReturnType<typeof createClient>>,
  buildingId: string,
  newServiceDays: number,
): Promise<string | null> {
  const { data: areas } = await supabase
    .from('areas')
    .select('id, frequency, frequency_source')
    .eq('building_id', buildingId)

  const { error: areaError } = await supabase
    .from('areas')
    .update({ frequency: newServiceDays })
    .eq('building_id', buildingId)
    .eq('frequency_source', 'inherited')
  if (areaError) return areaError.message

  for (const area of areas ?? []) {
    const effective = resolveAreaEffectiveFrequency(area, newServiceDays)
    const { error: taskError } = await supabase
      .from('task_line_items')
      .update({ frequency: effective })
      .eq('area_id', area.id)
      .eq('frequency_source', 'inherited')
    if (taskError) return taskError.message
  }
  return null
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
