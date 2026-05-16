alter table task_codes
  add column if not exists task_type_id    uuid references task_types(id) on delete set null,
  add column if not exists position_id     uuid references positions(id) on delete set null,
  add column if not exists production_rate numeric,
  add column if not exists description_alt text;

alter table task_codes
  add constraint task_codes_desc_alt_length check (char_length(description_alt) <= 255);
