alter table task_types
  drop constraint if exists task_types_code_length,
  drop column if exists type_code;
