-- Bid summary: one record per building (overhead & profit settings)
create table if not exists bid_summary (
  id                uuid        primary key default gen_random_uuid(),
  building_id       uuid        not null unique references buildings(id) on delete cascade,
  overhead_pct      numeric     not null default 0,
  profit_markup_pct numeric     not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Labor by position
create table if not exists bid_labor_lines (
  id           uuid        primary key default gen_random_uuid(),
  building_id  uuid        not null references buildings(id) on delete cascade,
  position_id  uuid        references positions(id) on delete set null,
  annual_hours numeric,
  vacation_pct numeric     not null default 4,
  sick_hours   numeric,
  rate         numeric,
  annual_cost  numeric,
  sort_order   integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Labor related costs (Section 2)
create table if not exists bid_labor_costs (
  id          uuid        primary key default gen_random_uuid(),
  building_id uuid        not null references buildings(id) on delete cascade,
  description text,
  type        text        not null default 'per_year'
              constraint bid_labor_costs_type check (type in ('percent_markup', 'per_hour', 'per_year')),
  factor      numeric,
  annual_cost numeric,
  sort_order  integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Other direct costs (Section 3)
create table if not exists bid_other_costs (
  id          uuid        primary key default gen_random_uuid(),
  building_id uuid        not null references buildings(id) on delete cascade,
  description text,
  type        text        not null default 'per_year'
              constraint bid_other_costs_type check (type in ('percent_markup', 'per_hour', 'per_year')),
  factor      numeric,
  annual_cost numeric,
  sort_order  integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Triggers
create trigger bid_summary_updated_at     before update on bid_summary     for each row execute function update_updated_at();
create trigger bid_labor_lines_updated_at before update on bid_labor_lines for each row execute function update_updated_at();
create trigger bid_labor_costs_updated_at before update on bid_labor_costs for each row execute function update_updated_at();
create trigger bid_other_costs_updated_at before update on bid_other_costs for each row execute function update_updated_at();

-- RLS
alter table bid_summary     enable row level security;
alter table bid_labor_lines enable row level security;
alter table bid_labor_costs enable row level security;
alter table bid_other_costs enable row level security;

-- bid_summary policies
create policy "Authenticated users can read bid_summary"    on bid_summary for select to authenticated using (true);
create policy "Authenticated users can insert bid_summary"  on bid_summary for insert to authenticated with check (true);
create policy "Authenticated users can update bid_summary"  on bid_summary for update to authenticated using (true) with check (true);
create policy "Only admins can delete bid_summary"          on bid_summary for delete to authenticated using (get_user_role() = 'admin');

-- bid_labor_lines policies
create policy "Authenticated users can read bid_labor_lines"   on bid_labor_lines for select to authenticated using (true);
create policy "Authenticated users can insert bid_labor_lines" on bid_labor_lines for insert to authenticated with check (true);
create policy "Authenticated users can update bid_labor_lines" on bid_labor_lines for update to authenticated using (true) with check (true);
create policy "Only admins can delete bid_labor_lines"         on bid_labor_lines for delete to authenticated using (get_user_role() = 'admin');

-- bid_labor_costs policies
create policy "Authenticated users can read bid_labor_costs"   on bid_labor_costs for select to authenticated using (true);
create policy "Authenticated users can insert bid_labor_costs" on bid_labor_costs for insert to authenticated with check (true);
create policy "Authenticated users can update bid_labor_costs" on bid_labor_costs for update to authenticated using (true) with check (true);
create policy "Only admins can delete bid_labor_costs"         on bid_labor_costs for delete to authenticated using (get_user_role() = 'admin');

-- bid_other_costs policies
create policy "Authenticated users can read bid_other_costs"   on bid_other_costs for select to authenticated using (true);
create policy "Authenticated users can insert bid_other_costs" on bid_other_costs for insert to authenticated with check (true);
create policy "Authenticated users can update bid_other_costs" on bid_other_costs for update to authenticated using (true) with check (true);
create policy "Only admins can delete bid_other_costs"         on bid_other_costs for delete to authenticated using (get_user_role() = 'admin');
