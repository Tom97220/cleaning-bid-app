-- Drop the redundant restroom_sqft column from areas.
-- Restroom floor area is captured under Tile/VCT Sq Ft, so this column (added in
-- migration 039 earlier today) is redundant and holds no data anywhere.
alter table areas drop column if exists restroom_sqft;

notify pgrst, 'reload schema';
