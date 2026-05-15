-- Replace the permissive catch-all policy with role-based policies

drop policy if exists "Authenticated users can do everything" on prospects;

create policy "Authenticated users can read prospects"
  on prospects for select
  to authenticated
  using (true);

create policy "Authenticated users can create prospects"
  on prospects for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update prospects"
  on prospects for update
  to authenticated
  using (true)
  with check (true);

-- Only admins can delete
create policy "Only admins can delete prospects"
  on prospects for delete
  to authenticated
  using (get_user_role() = 'admin');
