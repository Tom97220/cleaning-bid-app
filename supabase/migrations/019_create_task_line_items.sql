create table if not exists task_line_items (
  id             uuid         primary key default gen_random_uuid(),
  area_id        uuid         not null references areas(id) on delete cascade,
  task_code_id   uuid         references task_codes(id) on delete set null,
  task_name      text         not null,
  position_id    uuid         references positions(id) on delete set null,
  frequency      integer,
  percent        numeric      not null default 100,
  quantity       numeric,
  minutes        numeric,
  print          boolean      not null default true,
  measure        text,
  type           text,
  yearly_hrs     numeric,
  weekly_hrs     numeric,
  daily_hrs      numeric,
  monthly_hrs    numeric,
  created_at     timestamptz  not null default now(),
  updated_at     timestamptz  not null default now()
);

create trigger task_line_items_updated_at
  before update on task_line_items
  for each row execute function update_updated_at();

alter table task_line_items enable row level security;

create policy "Authenticated users can read task line items"
  on task_line_items for select
  to authenticated
  using (true);

create policy "Authenticated users can create task line items"
  on task_line_items for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update task line items"
  on task_line_items for update
  to authenticated
  using (true)
  with check (true);

create policy "Only admins can delete task line items"
  on task_line_items for delete
  to authenticated
  using (get_user_role() = 'admin');
