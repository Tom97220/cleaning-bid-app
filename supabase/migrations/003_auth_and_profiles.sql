-- Profiles table linked to Supabase auth.users
create table if not exists profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       text        not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Security-definer function: queries profiles bypassing RLS to avoid recursion
create or replace function get_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

-- SELECT: own row always readable; admins can read all
create policy "Users can read own profile"
  on profiles for select
  to authenticated
  using (id = auth.uid() or get_user_role() = 'admin');

-- UPDATE: users can update their own profile but cannot escalate their role
create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using  (id = auth.uid() or get_user_role() = 'admin')
  with check (
    (id = auth.uid() and role = get_user_role())
    or get_user_role() = 'admin'
  );

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- NOTE: To make a user an admin, run:
--   update profiles set role = 'admin' where email = 'you@example.com';
