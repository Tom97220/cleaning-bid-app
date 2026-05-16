create table if not exists building_types (
  id          uuid         primary key default gen_random_uuid(),
  type_name   text         not null unique,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now(),
  constraint building_types_name_length check (char_length(type_name) <= 50)
);

create trigger building_types_updated_at
  before update on building_types
  for each row execute function update_updated_at();

alter table building_types enable row level security;

create policy "Authenticated users can read building types"
  on building_types for select
  to authenticated
  using (true);

create policy "Only admins can create building types"
  on building_types for insert
  to authenticated
  with check (get_user_role() = 'admin');

create policy "Only admins can update building types"
  on building_types for update
  to authenticated
  using (get_user_role() = 'admin')
  with check (get_user_role() = 'admin');

create policy "Only admins can delete building types"
  on building_types for delete
  to authenticated
  using (get_user_role() = 'admin');
