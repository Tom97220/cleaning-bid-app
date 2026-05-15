-- Widen the prospect_type check constraint to include 'other'
alter table prospects drop constraint if exists prospects_prospect_type_check;

alter table prospects
  add constraint prospects_prospect_type_check
  check (prospect_type in ('commercial', 'industrial', 'medical', 'educational', 'other'));
