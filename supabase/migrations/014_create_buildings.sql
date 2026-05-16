create table if not exists buildings (
  id                uuid         primary key default gen_random_uuid(),
  prospect_id       uuid         not null references prospects(id) on delete cascade,
  building_name     text         not null,
  address           text,
  city              text,
  state             text,
  zip               text,
  building_type_id  uuid         references building_types(id) on delete set null,
  square_feet       numeric,
  floors            integer,
  notes             text,
  directions        text,
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now(),
  constraint buildings_name_length check (char_length(building_name) <= 50)
);

create trigger buildings_updated_at
  before update on buildings
  for each row execute function update_updated_at();

alter table buildings enable row level security;

create policy "Authenticated users can read buildings"
  on buildings for select
  to authenticated
  using (true);

create policy "Authenticated users can create buildings"
  on buildings for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update buildings"
  on buildings for update
  to authenticated
  using (true)
  with check (true);

create policy "Only admins can delete buildings"
  on buildings for delete
  to authenticated
  using (get_user_role() = 'admin');
