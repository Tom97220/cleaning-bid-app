-- Public storage bucket for company/customer logos.
-- Logos render on report headers, cover pages, and job cards via a public URL,
-- so the bucket is public-read; writes are admin-only, matching company_settings.

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Public read (reports render via the public URL)
create policy "Public read logos"
  on storage.objects for select
  using (bucket_id = 'logos');

-- Admin-only write, consistent with company_settings policies
create policy "Admins upload logos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and get_user_role() = 'admin');

create policy "Admins update logos"
  on storage.objects for update to authenticated
  using (bucket_id = 'logos' and get_user_role() = 'admin');

create policy "Admins delete logos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and get_user_role() = 'admin');
