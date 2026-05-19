-- Rebuild job_cards: position_id FK replaces position_title, add route,
-- service_days array for schedule columns, schedule_assignments json for
-- core-per-day grid, drop team column

alter table job_cards
  add column if not exists position_id uuid references positions(id) on delete set null;

alter table job_cards
  add column if not exists route text;

alter table job_cards
  add column if not exists service_days text[] not null default '{}';

-- maps service-day name → 0-based core index from job_card_detail_schedule sort_order
alter table job_cards
  add column if not exists schedule_assignments jsonb not null default '{}';

alter table job_cards
  drop column if exists position_title;

alter table job_cards
  drop column if exists team;
