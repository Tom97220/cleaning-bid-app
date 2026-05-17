-- Replace overhead_pct and profit_markup_pct with a unified margin approach
-- margin_type: 'percent' = Gross Margin %, 'fixed_fee' = flat dollar fee

alter table bid_summary
  drop column if exists overhead_pct,
  drop column if exists profit_markup_pct,
  add column if not exists margin_type  text    not null default 'percent'
    constraint bid_summary_margin_type check (margin_type in ('percent', 'fixed_fee')),
  add column if not exists margin_value numeric not null default 0;
