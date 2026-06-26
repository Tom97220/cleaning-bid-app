-- Per-customer logo. One logo per prospect, stored as a public URL in the shared
-- `logos` bucket; rendered on reports/job cards in later builds.
alter table prospects add column if not exists logo_url text;

comment on column prospects.logo_url is 'Public URL of the customer''s logo in the logos bucket. Shown alongside the company logo on reports/job cards.';

notify pgrst, 'reload schema';
