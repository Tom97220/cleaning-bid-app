-- Drop the common_sqft column from areas.
-- Common-area square footage is now entered manually on the Building Profile (page 1),
-- so this per-area column (added in migration 039) is no longer used.
-- NOTE: this drops any common_sqft values already entered — test data only, safe to lose.
alter table areas drop column if exists common_sqft;

notify pgrst, 'reload schema';
