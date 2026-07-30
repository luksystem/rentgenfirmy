-- D37 backfill (mapowanie zatwierdzone przez wlasciciela). Cztery tory, kazdy z asercja liczby
-- wierszy (standard testowy (a) z CLAUDE.md - migracja bez asercji, ktora nic nie zrobila, wyglada
-- jak sukces).
--
-- Mapowanie po tytule kolumny (jedna regula pokrywa 65/65 kolumn i wszystkie 5 kolumn szablonu):
--   Zgłoszone / W trakcie / Do przetestowania -> W_TOKU
--   Prace dodatkowe -> CZEKA_NA_ZEWNETRZNE + OCZEKIWANIE_DECYZJA_INWESTORA
--   Zatwierdzone -> ZAMKNIETE
-- Tytul nieznany -> bez mapowania (rotStatus null, poza rejestrem). Mapa wpisana inline (nie jako
-- funkcja pomocnicza), zeby migracja byla samodzielna i nie zalezala od cyklu zycia sesji.
--
-- Tor 3 (snapshoty) NIE byl w pierwotnym zadaniu - znaleziony przy weryfikacji: tablica kanban
-- powstaje z ZAKOTWICZONEGO szablonu projektu (project_processes.template_snapshot, czytanego przez
-- resolveAnchoredProcessTemplate -> ProcessItemPanel -> templatePayload), nie z zywego szablonu.
-- Bez tego toru 94 projekty DOM, ktore jeszcze nie otworzyly swojej tablicy, tworzylyby ja dalej bez
-- konfiguracji ROT. Przepisanie zagniezdzone ma guard jsonb_typeof(...)='array' na kazdym poziomie -
-- brakujacy/nietablicowy poziom zostaje bez zmian zamiast zerowac snapshot. Zweryfikowane dry-runem
-- na zywym projekcie przed wdrozeniem: 10 etapow -> 10, 7 elementow -> 7, id/title/position kolumn
-- niezmienione.
--
-- Tor 2a: 6 kolumn ma juz RECZNIE ustawiony rot_status (w tym 2 ODWROTNIE niz mapowanie:
-- "Do przetestowania"=CZEKA_NA_ZEWNETRZNE i "Prace dodatkowe"=W_TOKU). Reczne ustawienie ma
-- pierwszenstwo (D37 pkt 2 - nadpisanie zostaje), wiec ich rot_status NIE jest ruszany; dostaja
-- tylko is_rejestr_tematow=true, zeby wrocily do ROT dokladnie w stanie, w ktorym dzialaly przed
-- migracja 256.

-- ── Tor 1: zywy szablon (process_items.default_payload) ─────────────────────────────────────────
do $$
declare
  v_map jsonb := '{
    "zgłoszone":          {"rotStatus":"W_TOKU","category":null,"isRejestrTematow":true},
    "w trakcie":          {"rotStatus":"W_TOKU","category":null,"isRejestrTematow":true},
    "do przetestowania":  {"rotStatus":"W_TOKU","category":null,"isRejestrTematow":true},
    "prace dodatkowe":    {"rotStatus":"CZEKA_NA_ZEWNETRZNE","category":"OCZEKIWANIE_DECYZJA_INWESTORA","isRejestrTematow":true},
    "zatwierdzone":       {"rotStatus":"ZAMKNIETE","category":null,"isRejestrTematow":true}
  }'::jsonb;
  v_none jsonb := '{"rotStatus":null,"category":null,"isRejestrTematow":false}'::jsonb;
  v_updated int;
  v_expected int := 1;
begin
  update public.process_items pi
  set default_payload = jsonb_set(
    pi.default_payload,
    '{columns}',
    (
      select coalesce(jsonb_agg(
        col || coalesce(v_map -> lower(btrim(col->>'title')), v_none)
        order by coalesce((col->>'position')::int, 0)
      ), '[]'::jsonb)
      from jsonb_array_elements(pi.default_payload->'columns') col
    )
  )
  where pi.kind = 'kanban'
    and jsonb_typeof(pi.default_payload->'columns') = 'array';

  get diagnostics v_updated = row_count;
  if v_updated <> v_expected then
    raise exception 'Tor 1 (zywy szablon): oczekiwano % elementow kanban, zaktualizowano %', v_expected, v_updated;
  end if;
end $$;

-- ── Tor 2a: kolumny z RECZNIE ustawionym statusem — tylko przywrocenie widocznosci w ROT ─────────
do $$
declare
  v_updated int;
  v_expected int := 6;
begin
  update public.process_kanban_columns
  set is_rejestr_tematow = true
  where rot_status is not null
    and is_rejestr_tematow = false;

  get diagnostics v_updated = row_count;
  if v_updated <> v_expected then
    raise exception 'Tor 2a (reczne ustawienia): oczekiwano % kolumn, zaktualizowano %', v_expected, v_updated;
  end if;
end $$;

-- ── Tor 2b: kolumny bez statusu — mapowanie heurystyczne po tytule ───────────────────────────────
do $$
declare
  v_map jsonb := '{
    "zgłoszone":          {"rotStatus":"W_TOKU","category":null,"isRejestrTematow":true},
    "w trakcie":          {"rotStatus":"W_TOKU","category":null,"isRejestrTematow":true},
    "do przetestowania":  {"rotStatus":"W_TOKU","category":null,"isRejestrTematow":true},
    "prace dodatkowe":    {"rotStatus":"CZEKA_NA_ZEWNETRZNE","category":"OCZEKIWANIE_DECYZJA_INWESTORA","isRejestrTematow":true},
    "zatwierdzone":       {"rotStatus":"ZAMKNIETE","category":null,"isRejestrTematow":true}
  }'::jsonb;
  v_none jsonb := '{"rotStatus":null,"category":null,"isRejestrTematow":false}'::jsonb;
  v_updated int;
  v_expected int := 59;
begin
  update public.process_kanban_columns c
  set rot_status = (coalesce(v_map -> lower(btrim(c.title)), v_none))->>'rotStatus',
      category = (coalesce(v_map -> lower(btrim(c.title)), v_none))->>'category',
      is_rejestr_tematow = ((coalesce(v_map -> lower(btrim(c.title)), v_none))->>'isRejestrTematow')::boolean
  where c.rot_status is null;

  get diagnostics v_updated = row_count;
  if v_updated <> v_expected then
    raise exception 'Tor 2b (mapowanie): oczekiwano % kolumn, zaktualizowano %', v_expected, v_updated;
  end if;
end $$;

-- ── Tor 3: zakotwiczone snapshoty projektow (project_processes.template_snapshot) ────────────────
do $$
declare
  v_map jsonb := '{
    "zgłoszone":          {"rotStatus":"W_TOKU","category":null,"isRejestrTematow":true},
    "w trakcie":          {"rotStatus":"W_TOKU","category":null,"isRejestrTematow":true},
    "do przetestowania":  {"rotStatus":"W_TOKU","category":null,"isRejestrTematow":true},
    "prace dodatkowe":    {"rotStatus":"CZEKA_NA_ZEWNETRZNE","category":"OCZEKIWANIE_DECYZJA_INWESTORA","isRejestrTematow":true},
    "zatwierdzone":       {"rotStatus":"ZAMKNIETE","category":null,"isRejestrTematow":true}
  }'::jsonb;
  v_none jsonb := '{"rotStatus":null,"category":null,"isRejestrTematow":false}'::jsonb;
  v_updated int;
  v_expected int := 107;
begin
  update public.project_processes pp
  set template_snapshot = jsonb_set(
    pp.template_snapshot,
    '{stages}',
    (
      select coalesce(jsonb_agg(
        case when jsonb_typeof(st->'milestones') = 'array' then jsonb_set(st, '{milestones}', (
          select coalesce(jsonb_agg(
            case when jsonb_typeof(ms->'items') = 'array' then jsonb_set(ms, '{items}', (
              select coalesce(jsonb_agg(
                case
                  when it->>'kind' = 'kanban'
                       and jsonb_typeof(it #> '{defaultPayload,columns}') = 'array'
                  then jsonb_set(it, '{defaultPayload,columns}', (
                    select coalesce(jsonb_agg(
                      col || coalesce(v_map -> lower(btrim(col->>'title')), v_none)
                      order by coalesce((col->>'position')::int, 0)
                    ), '[]'::jsonb)
                    from jsonb_array_elements(it #> '{defaultPayload,columns}') col
                  ))
                  else it
                end
                order by coalesce((it->>'position')::int, 0)
              ), '[]'::jsonb)
              from jsonb_array_elements(ms->'items') it
            )) else ms end
            order by coalesce((ms->>'position')::int, 0)
          ), '[]'::jsonb)
          from jsonb_array_elements(st->'milestones') ms
        )) else st end
        order by coalesce((st->>'position')::int, 0)
      ), '[]'::jsonb)
      from jsonb_array_elements(pp.template_snapshot->'stages') st
    )
  )
  where jsonb_typeof(pp.template_snapshot->'stages') = 'array'
    and pp.template_snapshot::text like '%"kanban"%';

  get diagnostics v_updated = row_count;
  if v_updated <> v_expected then
    raise exception 'Tor 3 (snapshoty): oczekiwano % snapshotow z kanbanem, zaktualizowano %', v_expected, v_updated;
  end if;
end $$;
