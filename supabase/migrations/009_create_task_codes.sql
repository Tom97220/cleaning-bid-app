create table if not exists task_codes (
  id               uuid         primary key default gen_random_uuid(),
  task_code        text         not null unique,
  task_name        text         not null,
  description      text,
  unit_of_measure  text         not null,
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now(),
  constraint task_codes_code_length        check (char_length(task_code) <= 35),
  constraint task_codes_name_length        check (char_length(task_name) <= 35),
  constraint task_codes_desc_length        check (char_length(description) <= 255),
  constraint task_codes_unit_values        check (unit_of_measure in ('sqft_per_hour', 'minutes_per_unit'))
);

create trigger task_codes_updated_at
  before update on task_codes
  for each row execute function update_updated_at();

alter table task_codes enable row level security;

create policy "Authenticated users can read task codes"
  on task_codes for select
  to authenticated
  using (true);

create policy "Only admins can create task codes"
  on task_codes for insert
  to authenticated
  with check (get_user_role() = 'admin');

create policy "Only admins can update task codes"
  on task_codes for update
  to authenticated
  using (get_user_role() = 'admin')
  with check (get_user_role() = 'admin');

create policy "Only admins can delete task codes"
  on task_codes for delete
  to authenticated
  using (get_user_role() = 'admin');
