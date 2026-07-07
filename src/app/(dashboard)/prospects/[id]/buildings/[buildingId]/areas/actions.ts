'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Area } from '@/types/area'

export type ActionState = { error: string } | null

export type AreaPatch = Partial<Pick<Area,
  | 'area_name' | 'room_count' | 'carpet_sqft' | 'tile_vct_sqft'
  | 'other_sqft' | 'fixtures' | 'frequency' | 'print_order'
  | 'notes' | 'square_footage'
  | 'sinks' | 'showers' | 'fountains' | 'stairwells'
>>

async function assertAuthenticated(): Promise<ActionState> {
  const role = await getUserRole()
  if (!role) return { error: 'You must be signed in.' }
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

// When an area's frequency changes, cascade by value-match to that area's OWN
// tasks only: task_line_items in this one area whose frequency equals the area's
// old value move to the new value; tasks at any other value are untouched.
// Guarded: a blanked (null) new frequency never wipes tasks, and a null old
// value matches nothing, so both are no-ops.
async function cascadeAreaFrequency(
  supabase: Awaited<ReturnType<typeof createClient>>,
  areaId: string,
  oldFreq: number | null,
  newFreq: number | null,
): Promise<string | null> {
  if (oldFreq == null || newFreq == null || oldFreq === newFreq) return null
  const { error } = await supabase
    .from('task_line_items')
    .update({ frequency: newFreq })
    .eq('area_id', areaId)
    .eq('frequency', oldFreq)
  return error ? error.message : null
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

  const { data: existing } = await supabase
    .from('areas').select('frequency').eq('id', id).single()

  const { error } = await supabase.from('areas').update(data).eq('id', id)
  if (error) return { error: error.message }

  const cascadeError = await cascadeAreaFrequency(
    supabase, id, existing?.frequency ?? null, data.frequency,
  )
  if (cascadeError) return { error: cascadeError }

  revalidatePath(buildingPath(prospectId, buildingId))
  redirect(buildingPath(prospectId, buildingId))
}

export async function deleteArea(
  id: string,
  buildingId: string,
  prospectId: string
): Promise<ActionState> {
  const role = await getUserRole()
  if (!role) return { error: 'You must be signed in.' }

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

  const cascadeFreq = 'frequency' in patch
  let oldFreq: number | null = null
  if (cascadeFreq) {
    const { data: existing } = await supabase
      .from('areas').select('frequency').eq('id', id).single()
    oldFreq = existing?.frequency ?? null
  }

  const { error } = await supabase.from('areas').update(patch).eq('id', id)
  if (error) return { error: error.message }

  if (cascadeFreq) {
    const cascadeError = await cascadeAreaFrequency(supabase, id, oldFreq, patch.frequency ?? null)
    if (cascadeError) return { error: cascadeError }
  }

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
