alter table task_codes
  drop constraint if exists task_codes_desc_length,
  drop constraint if exists task_codes_desc_alt_length;

notify pgrst, 'reload schema';
