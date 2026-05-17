alter table areas drop constraint if exists areas_frequency_values;
alter table areas alter column frequency type integer using null;
