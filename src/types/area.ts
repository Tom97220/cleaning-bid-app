const FREQUENCY_MAP: Record<number, string> = {
  365: 'Daily',
  260: '5x/week',
  156: '3x/week',
  104: '2x/week',
  52:  '1x/week',
  26:  '1x/2 weeks',
  12:  '1x/month',
  4:   '4x/year',
  2:   '2x/year',
  1:   '1x/year',
}

export function formatFrequency(frequency: number | null | undefined): string {
  if (frequency == null) return '—'
  return FREQUENCY_MAP[frequency] ?? `${frequency}x/year`
}

export interface Area {
  id:             string
  building_id:    string
  area_name:      string
  square_footage: number | null
  frequency:      number | null
  print_order:    number | null
  notes:          string | null
  room_count:     number | null
  carpet_sqft:    number | null
  tile_vct_sqft:  number | null
  other_sqft:     number | null
  fixtures:       number | null
  sinks:          number | null
  showers:        number | null
  fountains:      number | null
  common_sqft:    number | null
  stairwells:     number | null
  created_at:     string
  updated_at:     string
}
