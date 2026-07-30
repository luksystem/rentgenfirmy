-- D43 krok 2 — cele dla pickera tablicy.
--
-- Tablice sa materializowane LENIWIE: 107 projektow ma zywy element kanbanowy, ale tablic istnieje
-- 13. Picker listuje wiec ELEMENTY KANBANOWE projektu, nie tablice; tablica powstaje przy
-- zatwierdzeniu (ensureKanbanBoard). board_id null = jeszcze nie istnieje, i to normalny stan.
--
-- LEFT JOIN na process_items, nie JOIN. Pierwsza wersja miala inner joina i cicho gubila 2 z 13
-- istniejacych tablic — w tym jedna z prawdziwa karta na Kobicu. Powod: 564 wierszy
-- project_process_items wskazuje na template_item_id, ktorego nie ma w process_items, a kolumna
-- NIE MA klucza obcego. Ukrycie celu, na ktorym wisi praca, byloby gorsze niz pokazanie go bez
-- tytulu z szablonu. Stad 120 celow, a nie 107: 107 zywych + 13 z martwa referencja.
--
-- active_stage_id jest typu TEXT (nie uuid) — stad rzutowanie. Bez niego flaga "etap biezacy"
-- bylaby wszedzie false i priorytet z ustalen wlasciciela cicho przestalby dzialac; asercja
-- na dole tego pilnuje.
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
    coalesce(pi.title, 'Element spoza aktualnego szablonu'),
    m.stage_id,
    s.title,
    s.position,
    coalesce(pp.active_stage_id = m.stage_id::text, false),
    b.id,
    ppi.payload
  from project_process_items ppi
  left join process_items pi on pi.id = ppi.template_item_id
  left join process_milestones m on m.id = pi.milestone_id
  left join process_stages s on s.id = m.stage_id
  left join project_processes pp on pp.project_id = ppi.project_id
  left join process_kanban_boards b on b.project_process_item_id = ppi.id
  where ppi.project_id = p_project_id
    and ppi.kind = 'kanban'
  order by
    coalesce(pp.active_stage_id = m.stage_id::text, false) desc,
    s.position nulls last,
    coalesce(pi.title, '');
$$;

comment on function public.report_task_targets is
  'D43 — elementy kanbanowe projektu jako cele dla zadania z ustalenia/zmiany. board_id null '
  'oznacza tablice jeszcze niezmaterializowana. LEFT JOIN na process_items celowo: 564 wierszy '
  'ma martwe template_item_id (brak FK), a cel z praca nie moze zniknac z listy.';

grant execute on function public.report_task_targets(uuid) to authenticated;
revoke execute on function public.report_task_targets(uuid) from public, anon;

do $$
declare
  v_celow integer;
  v_martwych integer;
  v_z_tablica integer;
  v_aktywnych integer;
  v_tablic integer;
begin
  select count(*),
         count(*) filter (where item_title = 'Element spoza aktualnego szablonu'),
         count(*) filter (where board_id is not null),
         count(*) filter (where is_active_stage)
  into v_celow, v_martwych, v_z_tablica, v_aktywnych
  from projects p cross join lateral report_task_targets(p.id);

  select count(*) into v_tablic from process_kanban_boards;

  -- 120 = 107 zywych elementow kanbanowych + 13 z martwa referencja do szablonu.
  if v_celow <> 120 then
    raise exception 'Oczekiwano 120 celow, jest %', v_celow;
  end if;
  if v_martwych <> 13 then
    raise exception 'Oczekiwano 13 celow z martwa referencja, jest %', v_martwych;
  end if;
  -- KAZDA istniejaca tablica musi byc osiagalna z pickera, takze ta z martwym szablonem.
  if v_z_tablica <> v_tablic then
    raise exception 'Picker gubi tablice: istnieje %, widocznych %', v_tablic, v_z_tablica;
  end if;
  if v_aktywnych = 0 then
    raise exception 'Zaden cel nie trafil w etap biezacy — rzutowanie active_stage_id nie dziala.';
  end if;

  raise notice 'OK: % celow (% martwych), %/% tablic widocznych, % na etapie biezacym.',
    v_celow, v_martwych, v_z_tablica, v_tablic, v_aktywnych;
end $$;
