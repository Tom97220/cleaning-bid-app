alter table job_cards
  add column if not exists notes_page1     text,
  add column if not exists notes_page1_alt text,
  add column if not exists notes_page2     text,
  add column if not exists notes_page2_alt text;
