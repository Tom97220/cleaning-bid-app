-- Drop the existing unit_of_measure check so we can add 'both'
alter table task_codes
  drop constraint if exists task_codes_unit_values;

-- Re-add it with 'both' as a valid option
alter table task_codes
  add constraint task_codes_unit_values
    check (unit_of_measure in ('sqft_per_hour', 'minutes_per_unit', 'both'));

-- Minutes/each rate (only used when unit_of_measure = 'both')
alter table task_codes
  add column if not exists rate_each numeric;

-- Default calc basis for 'both' codes (drives the line-item pre-selection)
alter table task_codes
  add column if not exists default_basis text,
  add constraint task_codes_default_basis_values
    check (default_basis in ('sqft_per_hour', 'minutes_per_unit'));

notify pgrst, 'reload schema';
