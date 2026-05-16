export const PROSPECT_TYPES = ['commercial', 'industrial', 'medical', 'educational', 'other'] as const
export const PROSPECT_STATUSES = ['active', 'inactive'] as const

export type ProspectType = (typeof PROSPECT_TYPES)[number]
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number]

export interface Prospect {
  id: string
  company_name: string
  contact_name: string | null
  contact_title: string | null
  phone: string | null
  email: string | null
  address:   string | null
  address_2: string | null
  city:      string | null
  state: string | null
  zip: string | null
  prospect_type: ProspectType | null
  status: ProspectStatus
  notes: string | null
  created_at: string
  updated_at: string
}
