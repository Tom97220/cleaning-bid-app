'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ActionState = { error: string } | null

function extractProspectData(formData: FormData) {
  return {
    company_name: (formData.get('company_name') as string).trim(),
    contact_name:  (formData.get('contact_name')  as string)?.trim() || null,
    contact_title: (formData.get('contact_title') as string)?.trim() || null,
    phone:         (formData.get('phone')          as string)?.trim() || null,
    email:         (formData.get('email')          as string)?.trim() || null,
    address:       (formData.get('address')        as string)?.trim() || null,
    address_2:     (formData.get('address_2')      as string)?.trim() || null,
    city:          (formData.get('city')           as string)?.trim() || null,
    state:         (formData.get('state')          as string)?.trim() || null,
    zip:           (formData.get('zip')            as string)?.trim() || null,
    prospect_type: (formData.get('prospect_type')  as string) || null,
    status:        (formData.get('status')         as string) || 'active',
    notes:         (formData.get('notes')          as string)?.trim() || null,
    logo_url:      (formData.get('logo_url')        as string)?.trim() || null,
  }
}

export async function createProspect(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const data = extractProspectData(formData)
  if (!data.company_name) return { error: 'Company name is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('prospects').insert(data)
  if (error) return { error: error.message }

  revalidatePath('/prospects')
  redirect('/prospects')
}

export async function updateProspect(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const data = extractProspectData(formData)
  if (!data.company_name) return { error: 'Company name is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('prospects').update(data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/prospects')
  redirect('/prospects')
}

export async function deleteProspect(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('prospects').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/prospects')
  return null
}
