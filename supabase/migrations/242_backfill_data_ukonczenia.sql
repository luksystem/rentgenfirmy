-- Krok A 2.2 (D27): backfill data_ukonczenia z project_processes.completions (jsonb), z asercja
-- liczby wierszy zgodnie ze standardem testowym (a) w docs/CLAUDE.md.
do $$
declare
  v_expected integer;
  v_updated integer;
begin
  select count(*) into v_expected
  from (
    select project_id, jsonb_object_keys(completions) as template_item_id
    from project_processes
    where completions != '{}'::jsonb
  ) x;

  with completion_entries as (
    select
      pp.project_id,
      (kv.key)::uuid as template_item_id,
      (kv.value ->> 'completedAt')::timestamptz as completed_at
    from project_processes pp,
      jsonb_each(pp.completions) as kv
    where pp.completions != '{}'::jsonb
  )
  update project_process_items ppi
  set data_ukonczenia = ce.completed_at
  from completion_entries ce
  where ppi.project_id = ce.project_id
    and ppi.template_item_id = ce.template_item_id
    and ce.completed_at is not null;

  get diagnostics v_updated = row_count;

  if v_updated <> v_expected then
    raise exception 'Backfill data_ukonczenia: oczekiwano % wierszy, zaktualizowano %. Sprawdz dopasowanie project_process_items do completions.', v_expected, v_updated;
  end if;
end $$;
