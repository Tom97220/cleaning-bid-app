-- Increase code and name character limits from 18 to 35
alter table positions drop constraint if exists positions_code_length;
alter table positions drop constraint if exists positions_name_length;

alter table positions
  add constraint positions_code_length check (char_length(position_code) <= 35),
  add constraint positions_name_length check (char_length(position_name) <= 35);
