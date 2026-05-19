alter table job_cards
  add column if not exists is_translated boolean not null default false;
