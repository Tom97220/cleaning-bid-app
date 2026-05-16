export type UnitOfMeasure = 'sqft_per_hour' | 'minutes_per_unit'

export const UNIT_OF_MEASURE_LABELS: Record<UnitOfMeasure, string> = {
  sqft_per_hour:    'Sq ft per hour',
  minutes_per_unit: 'Minutes per unit',
}

export interface TaskCode {
  id:               string
  task_code:        string
  task_name:        string
  task_type_id:     string | null
  position_id:      string | null
  unit_of_measure:  UnitOfMeasure
  production_rate:  number | null
  description:      string | null
  description_alt:  string | null
  created_at:       string
  updated_at:       string
}

export interface TaskCodeRow extends TaskCode {
  task_types: { type_name: string } | null
  positions:  { position_name: string } | null
}
