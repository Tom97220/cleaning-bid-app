-- Add building-level manual count fields shown on the Pinpoint Building Profile (page 1).
-- No per-area source exists for these, so they're entered on the building edit form
-- (same pattern as common_sqft / num_restrooms in migration 042).
alter table buildings add column if not exists num_elevators  integer;
alter table buildings add column if not exists num_stairwells integer;

comment on column buildings.num_elevators  is 'Manually-entered number of elevators. Shown on Pinpoint page 1.';
comment on column buildings.num_stairwells is 'Manually-entered number of stairwells. Shown on Pinpoint page 1.';

notify pgrst, 'reload schema';
