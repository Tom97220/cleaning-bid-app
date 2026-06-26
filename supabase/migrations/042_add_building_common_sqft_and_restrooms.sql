-- Add building-level manual fields shown on the Pinpoint Building Profile (page 1):
--   common_sqft   - common-area square footage (per-area common_sqft was removed in 041)
--   num_restrooms - number of restrooms (no per-area restroom count exists, so it's manual)
-- Both are entered on the building edit form.
alter table buildings add column if not exists common_sqft   numeric;
alter table buildings add column if not exists num_restrooms integer;

comment on column buildings.common_sqft   is 'Manually-entered common-area square footage. Shown on Pinpoint page 1 and added to summed area sqft for Total Square Footage.';
comment on column buildings.num_restrooms is 'Manually-entered number of restrooms. Shown on Pinpoint page 1.';

notify pgrst, 'reload schema';
