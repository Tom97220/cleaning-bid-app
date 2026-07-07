-- Reverse migration 046: drop the frequency_source marker columns.
-- The three-level inherit/override marker system was replaced by a simple
-- level-by-level value-match cascade (building->area->task), which needs no
-- per-row marker. No deployed code references these columns (the references
-- were removed in the marker->value-match reversal, commits 1 and 2), so
-- dropping them now is safe. IF EXISTS keeps this idempotent.

ALTER TABLE task_line_items DROP COLUMN IF EXISTS frequency_source;

ALTER TABLE areas DROP COLUMN IF EXISTS frequency_source;

notify pgrst, 'reload schema';
