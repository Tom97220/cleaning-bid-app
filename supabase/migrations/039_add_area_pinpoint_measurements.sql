-- Per-area Pinpoint measurement columns for the rebuilt Area Grid.
-- `fixtures` already holds the combined restroom fixture count (RR Fix:
-- toilets + urinals + restroom sinks) and is intentionally left unchanged.
alter table areas add column if not exists sinks         integer;  -- non-restroom sinks (restroom sinks count in fixtures)
alter table areas add column if not exists showers       integer;
alter table areas add column if not exists fountains     integer;
alter table areas add column if not exists common_sqft   numeric;  -- common-area square footage for the area
alter table areas add column if not exists restroom_sqft numeric;  -- restroom square footage for the area
alter table areas add column if not exists stairwells    integer;

notify pgrst, 'reload schema';
