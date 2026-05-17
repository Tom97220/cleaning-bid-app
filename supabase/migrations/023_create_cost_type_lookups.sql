-- Admin-managed lookup tables for bid cost line descriptions

create table if not exists labor_cost_types (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique
               constraint labor_cost_types_name_length check (char_length(name) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists other_cost_types (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique
               constraint other_cost_types_name_length check (char_length(name) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger labor_cost_types_updated_at
  before update on labor_cost_types
  for each row execute function update_updated_at();

create trigger other_cost_types_updated_at
  before update on other_cost_types
  for each row execute function update_updated_at();

-- RLS
alter table labor_cost_types enable row level security;
alter table other_cost_types  enable row level security;

-- All authenticated users can read
create policy "Authenticated users can read labor_cost_types"
  on labor_cost_types for select to authenticated using (true);
create policy "Authenticated users can read other_cost_types"
  on other_cost_types for select to authenticated using (true);

-- Only admins can write
create policy "Admins can insert labor_cost_types"
  on labor_cost_types for insert to authenticated with check (get_user_role() = 'admin');
create policy "Admins can update labor_cost_types"
  on labor_cost_types for update to authenticated using (get_user_role() = 'admin') with check (get_user_role() = 'admin');
create policy "Admins can delete labor_cost_types"
  on labor_cost_types for delete to authenticated using (get_user_role() = 'admin');

create policy "Admins can insert other_cost_types"
  on other_cost_types for insert to authenticated with check (get_user_role() = 'admin');
create policy "Admins can update other_cost_types"
  on other_cost_types for update to authenticated using (get_user_role() = 'admin') with check (get_user_role() = 'admin');
create policy "Admins can delete other_cost_types"
  on other_cost_types for delete to authenticated using (get_user_role() = 'admin');
