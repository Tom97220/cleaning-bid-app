-- Single-row company settings used on report headers and cover pages

create table if not exists company_settings (
  id           uuid        primary key default gen_random_uuid(),
  company_name text,
  address_1    text,
  address_2    text,
  city         text,
  state        text,
  zip          text,
  phone        text,
  email        text,
  logo_url     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger company_settings_updated_at
  before update on company_settings
  for each row execute function update_updated_at();

alter table company_settings enable row level security;

-- All authenticated users can read (required for report generation)
create policy "Authenticated users can read company_settings"
  on company_settings for select to authenticated using (true);

-- Only admins can write
create policy "Admins can insert company_settings"
  on company_settings for insert to authenticated
  with check (get_user_role() = 'admin');

create policy "Admins can update company_settings"
  on company_settings for update to authenticated
  using (get_user_role() = 'admin')
  with check (get_user_role() = 'admin');

create policy "Admins can delete company_settings"
  on company_settings for delete to authenticated
  using (get_user_role() = 'admin');
