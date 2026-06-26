-- Allow authenticated (non-admin) staff to upload CUSTOMER logos, scoped to the
-- customer/ folder of the logos bucket. This is ADDITIVE: the admin upload policy
-- from migration 038 ("Admins upload logos") is intentionally NOT dropped, so admins
-- keep full write access (including company-logo uploads to company/). Storage INSERT
-- policies are permissive (OR-ed), so this only widens access for customer/ — it does
-- not restrict anything. Public-read and UPDATE/DELETE policies are unchanged.
create policy "Authenticated upload customer logos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = 'customer'
  );

notify pgrst, 'reload schema';
