create table if not exists positions (
  id                uuid         primary key default gen_random_uuid(),
  position_code     text         not null unique,
  position_name     text         not null,
  description       text,
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now()
);

create trigger positions_updated_at
  before update on positions
  for each row execute function update_updated_at();

alter table positions enable row level security;

-- All authenticated users can read positions
create policy "Authenticated users can read positions"
  on positions for select
  to authenticated
  using (true);

-- Only admins can create, update, or delete
create policy "Only admins can create positions"
  on positions for insert
  to authenticated
  with check (get_user_role() = 'admin');

create policy "Only admins can update positions"
  on positions for update
  to authenticated
  using (get_user_role() = 'admin')
  with check (get_user_role() = 'admin');

create policy "Only admins can delete positions"
  on positions for delete
  to authenticated
  using (get_user_role() = 'admin');
