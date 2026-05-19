alter table job_cards
  add column if not exists special_instructions_alt text,
  add column if not exists directions_alt text;

alter table job_card_detail_schedule
  add column if not exists zone_area_alt text;
