create table if not exists prospects (
  id            uuid        primary key default gen_random_uuid(),
  company_name  text        not null,
  contact_name  text,
  contact_title text,
  phone         text,
  email         text,
  address       text,
  city          text,
  state         text,
  zip           text,
  prospect_type text        check (prospect_type in ('commercial', 'industrial', 'medical', 'educational')),
  status        text        not null default 'active' check (status in ('active', 'inactive')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-update updated_at on every row change
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger prospects_updated_at
  before update on prospects
  for each row execute function update_updated_at();

-- Row-level security (enable but allow all for now; restrict per-user later)
alter table prospects enable row level security;

create policy "Authenticated users can do everything"
  on prospects for all
  to authenticated
  using (true)
  with check (true);
