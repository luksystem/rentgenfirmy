-- process_stages.code — stabilny slug, niezależny od tytułu (docs/08, naprawa doraźna + zabezpieczenie
-- strukturalne po tym, jak seed 209 kluczujący na tytule trafił w zero wierszy).
--
-- Ścieżka: kolumna nullable -> backfill z potwierdzonego mapowania (szablon "DOM", id->code
-- zweryfikowane z właścicielem) + backfill mechaniczny dla pozostałych 7 szablonów -> NOT NULL +
-- unique(template_id, code) -> trigger blokujący zmianę kodu po utworzeniu.
--
-- ODPORNOŚĆ NA PRZYSZŁOŚĆ: rozbicie etapu (np. Etap 8 -> 8a/8b, /docs/03 §6) albo zmiana tytułu
-- NIGDY nie zmienia code istniejącego wiersza (trigger to blokuje twardo). Rozbicie modeluje się
-- jako NOWY wiersz process_stages z NOWYM, unikalnym code (np. 'etap_08a'/'etap_08b') — istniejący
-- wiersz zostaje (może dostać nowy tytuł "Etap 8a", ale code='etap_08' się nie zmienia). Każdy kod,
-- który kiedykolwiek istniał w danych, jest permanentnie ważny — dokładnie jak process_stages.id.

alter table public.process_stages add column if not exists code text;

comment on column public.process_stages.code is
  'Stabilny slug etapu, niezależny od tytułu. NIEZMIENNY po utworzeniu (trigger '
  'process_stages_code_immutable) — wszystko semantyczne (seedy, macierz odpowiedzialności, '
  'wymagane kompetencje) klucuje odtąd na code, nie na title. Rozbicie/zmiana etapu w przyszłości = '
  'nowy wiersz z nowym code, nigdy zmiana istniejącego.';

-- ---------------------------------------------------------------------------
-- Backfill potwierdzony z właścicielem: szablon "DOM" (10 etapów z /docs/01), dopasowanie po id
-- (jednorazowe, zweryfikowane ręcznie — nie generyczny wzorzec do powielania).
-- ---------------------------------------------------------------------------

update public.process_stages set code = 'etap_01' where id = 'c93a1d71-c129-4366-929b-0b3fb6e9ef2b';
update public.process_stages set code = 'etap_02' where id = 'a2ddff9a-fc18-41b1-a9cf-db67b129cd5c';
update public.process_stages set code = 'etap_03' where id = '666c8b79-5593-4457-bb53-4208d7d38688';
update public.process_stages set code = 'etap_04' where id = 'c116a7fe-e06d-4d10-8408-45f19f8704e8';
update public.process_stages set code = 'etap_05' where id = '1365f344-6771-4876-9706-caebff12d99d';
update public.process_stages set code = 'etap_06' where id = '22d8c9d0-49d2-4a94-8a9d-c4b29ae3444c';
update public.process_stages set code = 'etap_07' where id = '462f9a77-e0e3-4e83-85c1-22efd4190074';
update public.process_stages set code = 'etap_08' where id = '1d949e02-5bec-41db-b794-75cabea7c740';
update public.process_stages set code = 'etap_09' where id = '20046e47-f5fd-4a07-a389-51af117b460a';
update public.process_stages set code = 'etap_10' where id = '989d5ff3-d421-427e-a0a8-a1fe4e7f347f';

do $$
declare
  v_updated int;
begin
  select count(*) into v_updated from public.process_stages where code like 'etap\_%' escape '\';
  if v_updated <> 10 then
    raise exception 'Backfill etap_01..etap_10: oczekiwano 10 wierszy, wyszło %. Sprawdź id w mapowaniu.', v_updated;
  end if;
end $$;

-- Backfill mechaniczny dla pozostałych szablonów (Audio/BMS/Dom/Inne/Przemysłowe/Serwis/Sklep) —
-- brak semantycznego mapowania z docs/01 dla tych typów, kod tylko musi być stabilny i unikalny
-- w ramach template_id.
update public.process_stages
  set code = 'stage_' || position::text
  where code is null;

do $$
declare
  v_missing int;
begin
  select count(*) into v_missing from public.process_stages where code is null;
  if v_missing > 0 then
    raise exception 'process_stages.code backfill niekompletny: % wierszy nadal bez kodu.', v_missing;
  end if;
end $$;

alter table public.process_stages alter column code set not null;
alter table public.process_stages add constraint process_stages_template_code_uq unique (template_id, code);

create or replace function public.prevent_process_stage_code_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.code is distinct from old.code then
    raise exception
      'process_stages.code jest niezmienne po utworzeniu (etap %, było "%", próba zmiany na "%"). '
      'Rozbicie albo przemianowanie etapu modeluj jako NOWY wiersz z NOWYM code, nie zmianę istniejącego.',
      old.id, old.code, new.code;
  end if;
  return new;
end;
$$;

drop trigger if exists process_stages_code_immutable on public.process_stages;
create trigger process_stages_code_immutable
  before update on public.process_stages
  for each row execute function public.prevent_process_stage_code_change();

-- ---------------------------------------------------------------------------
-- Backfill snapshotów: code dopisany do każdego obiektu etapu w project_processes.template_snapshot,
-- dopasowany po id (który już jest w snapshocie i jest stabilny — cloneProcessTemplate go zachowuje).
-- Decyzja: backfill, nie rozwiązywanie dynamiczne przez żywy szablon — bo code ma żyć w snapshocie
-- dokładnie tak jak id, title i wszystkie inne atrybuty etapu; dynamiczne rozwiązanie złamałoby się
-- w tym samym momencie, w którym już wiemy, że się łamie (usunięcie etapu z żywego szablonu przy
-- wariancie/rozbiciu — patrz report_orphaned_stage_references).
-- ---------------------------------------------------------------------------

update public.project_processes pp
set template_snapshot = jsonb_set(
  pp.template_snapshot,
  '{stages}',
  coalesce((
    select jsonb_agg(merged.stage_json order by merged.ord)
    from (
      select
        se.ord,
        case
          when ps.code is not null then se.stage_elem || jsonb_build_object('code', ps.code)
          else se.stage_elem
        end as stage_json
      from jsonb_array_elements(pp.template_snapshot -> 'stages') with ordinality as se(stage_elem, ord)
      left join public.process_stages ps on ps.id = (se.stage_elem ->> 'id')::uuid
    ) merged
  ), '[]'::jsonb)
)
where pp.template_snapshot is not null
  and jsonb_typeof(pp.template_snapshot -> 'stages') = 'array';

-- ---------------------------------------------------------------------------
-- Re-seed standardu firmy dla szablonu "DOM", teraz kluczujący na code zamiast na tytule/wzorcu —
-- kanoniczna, odporna na przyszłość wersja seeda z 209/214. Idempotentne (UPDATE/UPSERT), bezpieczne
-- do wielokrotnego uruchomienia. KAŻDY blok kończy asercją liczby zmian (docs/08: "migracja, która
-- nic nie zrobiła i zgłosiła sukces, to najgorszy możliwy wariant").
-- ---------------------------------------------------------------------------

do $$
declare
  v_updated int;
  v_pairs text[][] := array[
    array['etap_01', 'INTENSYWNA'],
    array['etap_02', 'STANDARD'],
    array['etap_03', 'INTENSYWNA'],
    array['etap_04', 'STANDARD'],
    array['etap_05', 'STANDARD'],
    array['etap_06', 'CZUWANIE'],
    array['etap_07', 'INTENSYWNA'],
    array['etap_08', 'INTENSYWNA'],
    array['etap_09', 'KRYTYCZNA'],
    array['etap_10', 'STANDARD']
  ];
begin
  for i in 1 .. array_length(v_pairs, 1) loop
    update public.process_stages
      set base_communication_phase = v_pairs[i][2]::public.communication_phase_code
      where code = v_pairs[i][1];
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'base_communication_phase: kod "%" — oczekiwano 1 wiersza, wyszło %.', v_pairs[i][1], v_updated;
    end if;
  end loop;
end $$;

do $$
declare
  v_updated int;
begin
  update public.process_stages
    set sla_days = sla_days || jsonb_build_object('poprawki_dok', 7)
    where code = 'etap_06';
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'sla_days poprawki_dok: oczekiwano 1 wiersz (etap_06), wyszło %.', v_updated;
  end if;

  update public.process_stages
    set sla_days = sla_days || jsonb_build_object('rozstrzygniecie', 7)
    where code = 'etap_07';
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'sla_days rozstrzygniecie: oczekiwano 1 wiersz (etap_07), wyszło %.', v_updated;
  end if;
end $$;

do $$
declare
  v_updated int;
begin
  update public.process_stages
    set requires_project_stage_lead = true
    where code = 'etap_08';
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'requires_project_stage_lead: oczekiwano 1 wiersz (etap_08), wyszło %.', v_updated;
  end if;
end $$;

do $$
declare
  v_stage_id uuid;
  v_expected int := 37; -- 02§10: Etap 7 ma cztery role z wpisem (OP, KO, KT, LM), nie trzy — pierwotne 36 było błędem liczenia, nie danych.
  v_actual int;
  v_rows text[][] := array[
    array['etap_01', 'wlasciciel', 'true', 'false', 'false'],
    array['etap_01', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_01', 'koordynator_operacyjny', 'false', 'true', 'false'],

    array['etap_02', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_02', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['etap_02', 'projektant', 'true', 'false', 'false'],

    array['etap_03', 'wlasciciel', 'false', 'true', 'false'],
    array['etap_03', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_03', 'koordynator_techniczny', 'false', 'true', 'false'],
    array['etap_03', 'projektant', 'true', 'false', 'true'],

    array['etap_04', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_04', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['etap_04', 'koordynator_techniczny', 'true', 'false', 'true'],
    array['etap_04', 'projektant', 'false', 'true', 'false'],

    array['etap_05', 'wlasciciel', 'false', 'true', 'false'],
    array['etap_05', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_05', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['etap_05', 'koordynator_techniczny', 'true', 'false', 'false'],
    array['etap_05', 'projektant', 'false', 'true', 'false'],

    array['etap_06', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_06', 'koordynator_operacyjny', 'true', 'false', 'false'],
    array['etap_06', 'projektant', 'false', 'true', 'false'],
    array['etap_06', 'wdrozeniowiec', 'false', 'true', 'false'],

    array['etap_07', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_07', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['etap_07', 'koordynator_techniczny', 'true', 'false', 'true'],
    array['etap_07', 'lider_montazu', 'false', 'true', 'false'],

    array['etap_08', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_08', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['etap_08', 'koordynator_techniczny', 'true', 'false', 'false'],
    array['etap_08', 'lider_montazu', 'false', 'true', 'false'],

    array['etap_09', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_09', 'koordynator_techniczny', 'false', 'true', 'false'],
    array['etap_09', 'wdrozeniowiec', 'true', 'false', 'true'],

    array['etap_10', 'wlasciciel', 'false', 'true', 'false'],
    array['etap_10', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_10', 'wdrozeniowiec', 'true', 'false', 'true']
  ];
begin
  for i in 1 .. array_length(v_rows, 1) loop
    select id into v_stage_id from public.process_stages where code = v_rows[i][1];

    if v_stage_id is null then
      raise exception 'Macierz odpowiedzialności: kod "%" nie istnieje w process_stages.', v_rows[i][1];
    end if;

    insert into public.process_stage_role_responsibility
      (stage_id, role_code, is_glowny, is_wspiera, is_komunikuje)
    values
      (v_stage_id, v_rows[i][2], v_rows[i][3]::boolean, v_rows[i][4]::boolean, v_rows[i][5]::boolean)
    on conflict (stage_id, role_code) do update
      set is_glowny = excluded.is_glowny,
          is_wspiera = excluded.is_wspiera,
          is_komunikuje = excluded.is_komunikuje;
  end loop;

  select count(*) into v_actual
    from public.process_stage_role_responsibility r
    join public.process_stages ps on ps.id = r.stage_id
    where ps.code like 'etap\_%' escape '\';

  if v_actual <> v_expected then
    raise exception 'Macierz odpowiedzialności: oczekiwano % wierszy dla etap_01..etap_10, jest %.', v_expected, v_actual;
  end if;
end $$;
