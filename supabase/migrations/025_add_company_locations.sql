-- Add company_locations table for multi-location support.
-- Migrates any existing address data from company_settings into a default location,
-- then removes the address columns from company_settings.

create table if not exists company_locations (
  id            uuid        primary key default gen_random_uuid(),
  location_name varchar(50) not null default 'Main Office',
  address_1     text,
  address_2     text,
  city          text,
  state         text,
  zip           text,
  is_default    boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger company_locations_updated_at
  before update on company_locations
  for each row execute function update_updated_at();

alter table company_locations enable row level security;

create policy "Authenticated users can read company_locations"
  on company_locations for select to authenticated using (true);

create policy "Admins can insert company_locations"
  on company_locations for insert to authenticated
  with check (get_user_role() = 'admin');

create policy "Admins can update company_locations"
  on company_locations for update to authenticated
  using (get_user_role() = 'admin')
  with check (get_user_role() = 'admin');

create policy "Admins can delete company_locations"
  on company_locations for delete to authenticated
  using (get_user_role() = 'admin');

-- Migrate existing address data into a default location (if any)
insert into company_locations (location_name, address_1, address_2, city, state, zip, is_default)
select
  'Main Office',
  address_1,
  address_2,
  city,
  state,
  zip,
  true
from company_settings
where address_1 is not null or city is not null;

-- Remove address columns from company_settings (data preserved above)
alter table company_settings drop column if exists address_1;
alter table company_settings drop column if exists address_2;
alter table company_settings drop column if exists city;
alter table company_settings drop column if exists state;
alter table company_settings drop column if exists zip;
