ALTER TABLE buildings
  ADD COLUMN service_days integer NOT NULL DEFAULT 260;

COMMENT ON COLUMN buildings.service_days IS 'Number of service days per year for this building. Default 260 = 5 days/week. Used by reports to derive daily hours from annual hours.';
