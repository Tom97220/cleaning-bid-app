export interface BuildingType {
  id:         string
  type_name:  string
  created_at: string
  updated_at: string
}

export interface Building {
  id:               string
  prospect_id:      string
  building_name:    string
  address:          string | null
  address_2:        string | null
  city:             string | null
  state:            string | null
  zip:              string | null
  building_type_id: string | null
  square_feet:      number | null
  floors:           number | null
  common_sqft:      number | null
  num_restrooms:    number | null
  num_elevators:    number | null
  num_stairwells:   number | null
  service_days:     number
  notes:            string | null
  directions:       string | null
  created_at:       string
  updated_at:       string
}

export interface BuildingRow extends Building {
  building_types: { type_name: string } | null
}
