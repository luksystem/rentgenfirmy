-- Database linter (0011_function_search_path_mutable): pin search_path on the trigger function,
-- matching the convention used elsewhere (e.g. 223_rot_kanban_history_and_status_mapping.sql,
-- 278_stage_lead_history_and_candidates.sql).
create or replace function public.switchboard_circuit_log_status_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status or new.note is distinct from old.note then
    insert into public.switchboard_circuit_history
      (circuit_id, previous_status, new_status, note, changed_by_id, changed_by_name)
    values (
      new.id,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      new.note,
      new.updated_by_id,
      new.updated_by_name
    );
  end if;
  return new;
end;
$$;
