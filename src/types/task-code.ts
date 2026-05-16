export type UnitOfMeasure = 'sqft_per_hour' | 'minutes_per_unit'

export const UNIT_OF_MEASURE_LABELS: Record<UnitOfMeasure, string> = {
  sqft_per_hour:    'Sq ft per hour',
  minutes_per_unit: 'Minutes per unit',
}

export interface TaskCode {
  id:               string
  task_code:        string
  task_name:        string
  description:      string | null
  unit_of_measure:  UnitOfMeasure
  created_at:       string
  updated_at:       string
}
