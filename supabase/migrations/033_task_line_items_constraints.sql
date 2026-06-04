do $$
begin
  if exists (
    select 1 from task_line_items where task_code_id is null
  ) then
    raise exception 'Migration aborted: task_line_items has rows with null task_code_id. Clean up data first.';
  end if;

  if exists (
    select 1 from task_line_items
    where task_code_id is not null
    group by area_id, task_code_id
    having count(*) > 1
  ) then
    raise exception 'Migration aborted: task_line_items has duplicate (area_id, task_code_id) pairs. Clean up data first.';
  end if;
end;
$$;

alter table task_line_items
  drop constraint task_line_items_task_code_id_fkey;

alter table task_line_items
  add constraint task_line_items_task_code_id_fkey
  foreign key (task_code_id) references task_codes(id) on delete restrict;

alter table task_line_items
  alter column task_code_id set not null;

alter table task_line_items
  add constraint task_line_items_area_task_code_unique
  unique (area_id, task_code_id);
