-- Job Cards module: main card + four child section tables

create table if not exists job_cards (
  id                   uuid        primary key default gen_random_uuid(),
  prospect_id          uuid        not null references prospects(id) on delete cascade,
  building_id          uuid        references buildings(id) on delete set null,
  position_title       varchar(50) not null default '',
  shift_start          text,
  shift_end            text,
  team                 varchar(20),
  special_instructions text,
  directions           text,
  revised_date         date        not null default current_date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger job_cards_updated_at
  before update on job_cards
  for each row execute function update_updated_at();

alter table job_cards enable row level security;

create policy "auth select job_cards"
  on job_cards for select to authenticated using (true);

create policy "auth insert job_cards"
  on job_cards for insert to authenticated with check (true);

create policy "auth update job_cards"
  on job_cards for update to authenticated using (true) with check (true);

create policy "admin delete job_cards"
  on job_cards for delete to authenticated using (get_user_role() = 'admin');

-- Route rows
create table if not exists job_card_route_rows (
  id            uuid         primary key default gen_random_uuid(),
  job_card_id   uuid         not null references job_cards(id) on delete cascade,
  sort_order    integer      not null default 0,
  row_type      text         not null default 'task',
  time          varchar(10),
  area_location varchar(50),
  notes         varchar(100),
  duration      varchar(20),
  created_at    timestamptz  not null default now()
);

alter table job_card_route_rows enable row level security;

create policy "auth manage job_card_route_rows"
  on job_card_route_rows for all to authenticated using (true) with check (true);

-- Daily tasks
create table if not exists job_card_daily_tasks (
  id              uuid         primary key default gen_random_uuid(),
  job_card_id     uuid         not null references job_cards(id) on delete cascade,
  sort_order      integer      not null default 0,
  description_en  varchar(150) not null default '',
  description_alt varchar(150),
  created_at      timestamptz  not null default now()
);

alter table job_card_daily_tasks enable row level security;

create policy "auth manage job_card_daily_tasks"
  on job_card_daily_tasks for all to authenticated using (true) with check (true);

-- Detail schedule
create table if not exists job_card_detail_schedule (
  id          uuid         primary key default gen_random_uuid(),
  job_card_id uuid         not null references job_cards(id) on delete cascade,
  sort_order  integer      not null default 0,
  day_period  varchar(30)  not null default '',
  zone_area   varchar(50),
  created_at  timestamptz  not null default now()
);

alter table job_card_detail_schedule enable row level security;

create policy "auth manage job_card_detail_schedule"
  on job_card_detail_schedule for all to authenticated using (true) with check (true);

-- When detailing tasks
create table if not exists job_card_when_detailing (
  id              uuid         primary key default gen_random_uuid(),
  job_card_id     uuid         not null references job_cards(id) on delete cascade,
  sort_order      integer      not null default 0,
  description_en  varchar(150) not null default '',
  description_alt varchar(150),
  created_at      timestamptz  not null default now()
);

alter table job_card_when_detailing enable row level security;

create policy "auth manage job_card_when_detailing"
  on job_card_when_detailing for all to authenticated using (true) with check (true);
