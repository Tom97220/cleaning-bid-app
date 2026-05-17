-- Move vacation and sick tracking from per-line to building-level in bid_summary

alter table bid_summary
  add column if not exists vacation_pct              numeric not null default 4,
  add column if not exists vacation_hours_override   numeric,
  add column if not exists sick_hours_override       numeric,
  add column if not exists vacation_rate             numeric,
  add column if not exists sick_rate                 numeric;

alter table bid_labor_lines
  drop column if exists vacation_pct,
  drop column if exists sick_hours;
