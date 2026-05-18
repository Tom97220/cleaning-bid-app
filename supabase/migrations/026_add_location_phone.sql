-- Add per-location phone number to company_locations
alter table company_locations add column if not exists phone text;
