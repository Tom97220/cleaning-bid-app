create table if not exists areas (
  id             uuid         primary key default gen_random_uuid(),
  building_id    uuid         not null references buildings(id) on delete cascade,
  area_name      text         not null,
  square_footage numeric,
  frequency      integer,
  print_order    integer,
  notes          text,
  created_at     timestamptz  not null default now(),
  updated_at     timestamptz  not null default now(),
  constraint areas_name_length      check (char_length(area_name) <= 50),
  constraint areas_notes_length      check (char_length(notes) <= 255)
);

create trigger areas_updated_at
  before update on areas
  for each row execute function update_updated_at();

alter table areas enable row level security;

create policy "Authenticated users can read areas"
  on areas for select
  to authenticated
  using (true);

create policy "Authenticated users can create areas"
  on areas for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update areas"
  on areas for update
  to authenticated
  using (true)
  with check (true);

create policy "Only admins can delete areas"
  on areas for delete
  to authenticated
  using (get_user_role() = 'admin');
