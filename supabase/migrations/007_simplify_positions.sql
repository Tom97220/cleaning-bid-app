-- Drop position_type column
alter table positions drop column if exists position_type;

-- Enforce character limits at the database level
alter table positions
  add constraint positions_code_length check (char_length(position_code) <= 18),
  add constraint positions_name_length check (char_length(position_name) <= 18),
  add constraint positions_desc_length check (char_length(description)   <= 255);
