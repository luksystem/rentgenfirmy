-- Faza 9A — zapis faktu kontaktu ATOMOWO ze aktualizacja cache'u osi.
--
-- Dlaczego funkcja, a nie dwa zapytania z aplikacji: `projects.last_internal_activity_at` jest
-- CACHE'em (zrodlem prawdy jest zdarzenie), a cron przelicza go raz na dobe. Bez natychmiastowego
-- odswiezenia cache'u klikniecie "Odezwalismy sie" nie zdejmowaloby projektu z listy ciszy do
-- nastepnego dnia — czyli opiekun klikalby ten sam projekt kilka razy. Ten sam wzorzec co D27 2.2
-- (cache pisany W TEJ SAMEJ operacji co zrodlo, nigdy odwrotnie).
--
-- `greatest(...)` z coalesce: cache nigdy nie cofa sie w tyl przy wpisie wstecznym. Wpisanie
-- rozmowy z zeszlego tygodnia nie moze "postarzyc" projektu, w ktorym odezwalismy sie wczoraj.
create or replace function public.log_outgoing_contact(
  p_project_id uuid,
  p_event_at timestamptz,
  p_actor_id uuid default null,
  p_actor_name text default 'Zespół',
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_full_app_access() then
    raise exception 'Brak uprawnien do zapisu kontaktu z klientem';
  end if;

  insert into communication_events (project_id, direction, channel, event_at, actor_id, actor_name, note)
  values (p_project_id, 'wychodzace', 'reczny', p_event_at, p_actor_id,
          coalesce(nullif(btrim(p_actor_name), ''), 'Zespół'), coalesce(p_note, ''));

  update projects
  set last_internal_activity_at = greatest(coalesce(last_internal_activity_at, p_event_at), p_event_at)
  where id = p_project_id;
end $$;

comment on function public.log_outgoing_contact is
  'Faza 9A — "Odezwalismy sie do klienta": zdarzenie + natychmiastowe odswiezenie cache osi, '
  'atomowo. Tylko kierunek wychodzacy (decyzja wlasciciela: os kliencka wylacznie ze zrodel '
  'automatycznych, bo gdy nie odpowiadamy, nikt nie kliknie).';

grant execute on function public.log_outgoing_contact(uuid, timestamptz, uuid, text, text) to authenticated;
revoke execute on function public.log_outgoing_contact(uuid, timestamptz, uuid, text, text) from public, anon;
