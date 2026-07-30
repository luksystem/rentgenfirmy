-- D43 krok 2 — cele dla pickera tablicy.
--
-- Tablice sa materializowane LENIWIE: 107 projektow ma element kanbanowy, ale tablic istnieje 13.
-- Picker nie moze wiec listowac tablic — listuje ELEMENTY KANBANOWE projektu, a tablica powstaje
-- dopiero przy zatwierdzeniu (ensureKanbanBoard). board_id null = jeszcze nie istnieje, i to jest
-- normalny stan, nie blad.
--
-- is_active_stage niesie kolejnosc, o ktora prosil wlasciciel: etap biezacy priorytetowo,
-- reszta dostepna. Sortowanie zostaje tutaj, zeby UI nie wymyslalo wlasnego.
--
-- Migracja jest idempotentna (create or replace + same asercje), wiec bezpieczna do ponownego
-- uruchomienia — zastosowana przy zerwanym polaczeniu z Supabase, stan wymagal potwierdzenia.
create or replace function public.report_task_targets(p_project_id uuid)
returns table (
  project_process_item_id uuid,
  item_title text,
  stage_id uuid,
  stage_title text,
  stage_position integer,
  is_active_stage boolean,
  board_id uuid,
  payload jsonb
)
language sql
stable
set search_path = public
as $$
  select
    ppi.id,
    pi.title,
    m.stage_id,
    s.title,
    s.position,
    coalesce(pp.active_stage_id = m.stage_id, false),
    b.id,
    ppi.payload
  from project_process_items ppi
  join process_items pi on pi.id = ppi.template_item_id
  left join process_milestones m on m.id = pi.milestone_id
  left join process_stages s on s.id = m.stage_id
  left join project_processes pp on pp.project_id = ppi.project_id
  left join process_kanban_boards b on b.project_process_item_id = ppi.id
  where ppi.project_id = p_project_id
    and ppi.kind = 'kanban'
  order by
    coalesce(pp.active_stage_id = m.stage_id, false) desc,   -- etap biezacy na gorze
    s.position nulls last,
    pi.title;
$$;

comment on function public.report_task_targets is
  'D43 — elementy kanbanowe projektu jako cele dla zadania z ustalenia/zmiany. board_id null '
  'oznacza tablice jeszcze niezmaterializowana (tworzona leniwie przez ensureKanbanBoard).';

grant execute on function public.report_task_targets(uuid) to authenticated;
revoke execute on function public.report_task_targets(uuid) from public, anon;

do $$
declare
  v_projektow integer;
  v_celow integer;
  v_z_tablica integer;
begin
  select count(distinct ppi.project_id) into v_projektow
  from project_process_items ppi where ppi.kind = 'kanban';

  select count(*), count(*) filter (where board_id is not null)
  into v_celow, v_z_tablica
  from projects p cross join lateral report_task_targets(p.id);

  -- Inwentaryzacja: 107 elementow kanbanowych na 107 projektach, 13 zmaterializowanych tablic.
  if v_celow <> 107 then
    raise exception 'Oczekiwano 107 celow, jest %', v_celow;
  end if;
  if v_z_tablica <> 13 then
    raise exception 'Oczekiwano 13 celow z gotowa tablica, jest %', v_z_tablica;
  end if;

  raise notice 'OK: % celow na % projektach, % z gotowa tablica.', v_celow, v_projektow, v_z_tablica;
end $$;
