alter table task_codes add column is_active boolean not null default true;
create index task_codes_is_active_idx on task_codes (is_active);

notify pgrst, 'reload schema';
