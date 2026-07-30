-- Faza 10 punkt 3 (docs/08 D19 §5) — kanban jako zrodlo aktywnosci projektu.
--
-- "Kanban krytyczny — tam bedzie zyl ROT, wiec bez tego zrodla projekt prowadzony wzorowo na
-- rejestrze wyglada jak porzucony." Po D37 na tablicach kanban zyje 66 pozycji ROT, wiec to
-- przestalo byc teoretyczne.
--
-- Funkcja, a nie zapytanie z aplikacji: droga od karty do projektu to cztery skoki
-- (task -> column -> board -> project_process_item -> project). Trzymanie tego joina w SQL zamiast
-- sklejania czterech zapytan w TS jest tansze i mniej podatne na blad.
--
-- Kierunek: `created_by_side='client'` to karta zgloszona przez klienta — realny sygnal kliencki
-- (dokladnie przypadek "klient pisze na tablicy, my milczymy"). Reszta to nasza strona.
-- `closed_at` swiadomie NIE jest zrodlem: zamkniecie karty jest nasza czynnoscia i juz siedzi
-- w `updated_at`.
create or replace function public.report_kanban_activity_by_project(p_since timestamptz)
returns table (
  project_id uuid,
  team_at timestamptz,
  client_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    ppi.project_id,
    max(case when coalesce(t.created_by_side, 'team') <> 'client'
             then greatest(t.created_at, t.updated_at) end) as team_at,
    max(case when t.created_by_side = 'client'
             then greatest(t.created_at, t.updated_at) end) as client_at
  from process_kanban_tasks t
  join process_kanban_columns c on c.id = t.column_id
  join process_kanban_boards b on b.id = c.board_id
  join project_process_items ppi on ppi.id = b.project_process_item_id
  where greatest(t.created_at, t.updated_at) >= p_since
  group by ppi.project_id;
$$;

comment on function public.report_kanban_activity_by_project is
  'Faza 10 (docs/08 D19 §5 pkt 3) — aktywnosc z tablic kanban per projekt, rozdzielona na nasza '
  'i kliencka (created_by_side). Cztery skoki joina trzymane w SQL, nie sklejane w TS.';

grant execute on function public.report_kanban_activity_by_project(timestamptz) to authenticated;
revoke execute on function public.report_kanban_activity_by_project(timestamptz) from public, anon;
