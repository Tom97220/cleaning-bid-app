alter table areas add column if not exists room_count     integer;
alter table areas add column if not exists carpet_sqft    numeric;
alter table areas add column if not exists tile_vct_sqft  numeric;
alter table areas add column if not exists other_sqft     numeric;
alter table areas add column if not exists fixtures       integer;
