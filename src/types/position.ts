export const POSITION_TYPES = ['day', 'evening', 'night'] as const
export type PositionType = (typeof POSITION_TYPES)[number]

export interface Position {
  id: string
  position_code: string
  position_name: string
  position_type: PositionType
  base_hourly_rate: number
  description: string | null
  created_at: string
  updated_at: string
}
