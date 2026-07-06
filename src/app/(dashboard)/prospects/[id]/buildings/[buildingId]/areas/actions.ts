'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Area } from '@/types/area'
import { deriveFrequencySource } from '@/types/task-line-item'

export type ActionState = { error: string } | null

export type AreaPatch = Partial<Pick<Area,
  | 'area_name' | 'room_count' | 'carpet_sqft' | 'tile_vct_sqft'
  | 'other_sqft' | 'fixtures' | 'frequency' | 'frequency_source' | 'print_order'
  | 'notes' | 'square_footage'
  | 'sinks' | 'showers' | 'fountains' | 'stairwells'
>>

// An area's parent is the building; its effective inheritance value is just
// the building's service_days. Fetch it so create/edit can mark the row
// 'override' only when the entered frequency differs from service_days.
async function buildingServiceDays(
  supabase: Awaited<ReturnType<typeof createClient>>,
  buildingId: string,
): Promise<number> {
  const { data } = await supabase
    .from('buildings')
    .select('service_days')
    .eq('id', buildingId)
    .single()
  return data?.service_days ?? 260
}

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
  const sqftStr     = (formData.get('square_footage') as string)?.trim()
  const freqStr     = (formData.get('frequency') as string)?.trim()
  const orderStr    = (formData.get('print_order') as string)?.trim()
  const roomCntStr  = (formData.get('room_count') as string)?.trim()
  const carpetStr   = (formData.get('carpet_sqft') as string)?.trim()
  const tileStr     = (formData.get('tile_vct_sqft') as string)?.trim()
  const otherStr    = (formData.get('other_sqft') as string)?.trim()
  const fixturesStr = (formData.get('fixtures') as string)?.trim()
  return {
    area_name:      (formData.get('area_name') as string).trim(),
    square_footage: sqftStr    ? parseFloat(sqftStr)    : null,
    frequency:      freqStr    ? parseInt(freqStr, 10)  : null,
    print_order:    orderStr   ? parseInt(orderStr, 10) : null,
    notes:          (formData.get('notes') as string)?.trim() || null,
    room_count:    roomCntStr  ? parseInt(roomCntStr, 10)  : null,
    carpet_sqft:   carpetStr   ? parseFloat(carpetStr)     : null,
    tile_vct_sqft: tileStr     ? parseFloat(tileStr)       : null,
    other_sqft:    otherStr    ? parseFloat(otherStr)      : null,
    fixtures:      fixturesStr ? parseInt(fixturesStr, 10) : null,
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
  const frequency_source = deriveFrequencySource(data.frequency, await buildingServiceDays(supabase, buildingId))
  const { error } = await supabase.from('areas').insert({ ...data, building_id: buildingId, frequency_source })
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
  const frequency_source = deriveFrequencySource(data.frequency, await buildingServiceDays(supabase, buildingId))
  const { error } = await supabase.from('areas').update({ ...data, frequency_source }).eq('id', id)
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

export async function updateAreaField(
  id: string,
  patch: AreaPatch,
): Promise<ActionState> {
  const authError = await assertAuthenticated()
  if (authError) return authError

  const supabase = await createClient()
  const { error } = await supabase.from('areas').update(patch).eq('id', id)
  if (error) return { error: error.message }

  return null
}

export type InlineAreaData = {
  area_name:     string
  print_order:   number | null
  room_count:    number | null
  carpet_sqft:   number | null
  tile_vct_sqft: number | null
  other_sqft:    number | null
  fixtures:      number | null
  frequency:     number | null
  frequency_source: 'inherited' | 'override'
  sinks:         number | null
  showers:       number | null
  fountains:     number | null
  stairwells:    number | null
}

export async function createAreaInline(
  buildingId: string,
  data: InlineAreaData,
): Promise<{ row: Area | null; error: string | null }> {
  const authError = await assertAuthenticated()
  if (authError) return { row: null, error: authError.error }

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('areas')
    .insert({ ...data, building_id: buildingId })
    .select()
    .single()

  if (error) return { row: null, error: error.message }
  return { row: row as Area, error: null }
}
