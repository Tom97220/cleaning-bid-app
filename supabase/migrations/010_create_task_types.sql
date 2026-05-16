create table if not exists task_types (
  id          uuid         primary key default gen_random_uuid(),
  type_code   text         not null unique,
  type_name   text         not null,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now(),
  constraint task_types_code_length check (char_length(type_code) <= 35),
  constraint task_types_name_length check (char_length(type_name) <= 50)
);

create trigger task_types_updated_at
  before update on task_types
  for each row execute function update_updated_at();

alter table task_types enable row level security;

create policy "Authenticated users can read task types"
  on task_types for select
  to authenticated
  using (true);

create policy "Only admins can create task types"
  on task_types for insert
  to authenticated
  with check (get_user_role() = 'admin');

create policy "Only admins can update task types"
  on task_types for update
  to authenticated
  using (get_user_role() = 'admin')
  with check (get_user_role() = 'admin');

create policy "Only admins can delete task types"
  on task_types for delete
  to authenticated
  using (get_user_role() = 'admin');
