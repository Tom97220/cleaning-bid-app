-- Three-level frequency inherit/override: system-set marker columns.
-- 'inherited' = this row's frequency follows its parent (task→area, area→building.service_days);
-- 'override'  = manually changed, and cascades must leave it untouched.
-- Default 'inherited' so any existing row (Test Account scaffolding only) and any row
-- created before the app sets the marker reads as inheriting. No backfill needed.

ALTER TABLE areas
  ADD COLUMN frequency_source text NOT NULL DEFAULT 'inherited'
    CHECK (frequency_source IN ('inherited', 'override'));

ALTER TABLE task_line_items
  ADD COLUMN frequency_source text NOT NULL DEFAULT 'inherited'
    CHECK (frequency_source IN ('inherited', 'override'));

notify pgrst, 'reload schema';
