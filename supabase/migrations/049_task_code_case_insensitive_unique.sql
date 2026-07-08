-- Make task_codes.task_code unique CASE-INSENSITIVELY, while storing it
-- exactly as typed (the app no longer force-uppercases on save).
--
-- IMPORTANT — run the collision check FIRST. If two existing rows differ only
-- by case (e.g. 'MopFloor' and 'MOPFLOOR'), the unique index below will FAIL
-- to create. Detect and resolve any collisions before applying this migration:
--
--   select lower(task_code) as code_lower, count(*), array_agg(task_code)
--   from task_codes
--   group by lower(task_code)
--   having count(*) > 1;
--
-- If that returns zero rows, you're clear to run this migration.

-- a. Drop the case-SENSITIVE unique constraint created by the inline `unique`
--    on migration 009 (Postgres auto-named it task_codes_task_code_key).
--    Dropping the constraint also drops its backing index.
alter table task_codes
  drop constraint if exists task_codes_task_code_key;

-- b. Case-INSENSITIVE unique index — 'mopfloor' = 'MopFloor' = 'MOPFLOOR'.
create unique index task_codes_task_code_lower_idx
  on task_codes (lower(task_code));

-- c. Reload PostgREST schema cache.
notify pgrst, 'reload schema';
