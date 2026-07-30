-- D42 pkt 4b, poprawka: rozwiazywanie odpowiedzialnego chodzi lancuchem role_fallback.
-- Poprzednia wersja robila prosty join na slocie, wiec rola bez obsady dawala "brak obsady" nawet
-- wtedy, gdy slownik role_fallback mial zdefiniowane podstawienie. Skutkiem ubocznym badge
-- "zastepczo" nie mial jak sie zapalic — w project_role_slot nie ma i nie bedzie wierszy
-- z source='fallback', bo fallback jest REGULA, nie zapisem obsady.
--
-- To druga implementacja tej samej reguly co lib/process/role-fallback.ts (tam: asystent planowania
-- i zastepstwa urlopowe, tu: wyswietlanie). Swiadome — przepisanie tamtej na wolanie SQL kosztowaloby
-- wiecej niz jest warte. Asercja fikstuurowa na dole pilnuje, zeby sie nie rozjechaly.
--
-- UWAGA na nazwy: `current_role` to slowo zarezerwowane w Postgresie (funkcja SQL, jak current_user),
-- stad `cur_role` w CTE.
drop function if exists public.report_stage_responsible(uuid);

create function public.report_stage_responsible(p_project_id uuid)
returns table (
  stage_id uuid,
  stage_code text,
  stage_title text,
  stage_position integer,
  role_code text,
  role_name text,
  responsible_user_id uuid,
  responsible_name text,
  slot_source text,
  covered_by_role_code text,
  covered_by_role_name text,
  requires_project_stage_lead boolean,
  stage_lead_user_id uuid,
  stage_lead_name text
)
language sql
stable
set search_path = public
as $$
  with recursive slots as (
    select prs.role_code, prs.user_id
    from project_role_slot prs
    where prs.project_id = p_project_id and prs.to_date is null
  ),
  -- Limit glebokosci 5 i wykrywanie cyklu przez sciezke — role_fallback NIE ma zabezpieczenia
  -- przed cyklem w bazie (swiadoma decyzja z docs/08), wiec obrona zyje w kazdym czytelniku.
  chain (start_role, cur_role, depth, prio, path) as (
    select r.code, r.code, 0, 0, array[r.code]
    from role r
    union all
    select c.start_role, f.fallback_role_code, c.depth + 1, c.prio + f.priority,
           c.path || f.fallback_role_code
    from chain c
    join role_fallback f on f.role_code = c.cur_role
    left join slots s0 on s0.role_code = c.cur_role
    where c.depth < 5
      and s0.user_id is null                              -- rozwijamy tylko role BEZ obsady
      and not (f.fallback_role_code = any(c.path))        -- cykl w danych: przerwij, nie petl sie
  ),
  resolved as (
    select distinct on (c.start_role)
      c.start_role, c.cur_role as covered_by, c.depth, s.user_id
    from chain c
    join slots s on s.role_code = c.cur_role
    order by c.start_role, c.depth, c.prio
  )
  select
    s.id,
    s.code,
    s.title,
    s.position,
    r.role_code,
    ro.name,
    res.user_id,
    nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
    case
      when res.user_id is null then null
      when res.depth = 0 then 'obsada'
      else 'fallback'
    end,
    case when res.depth > 0 then res.covered_by end,
    case when res.depth > 0 then cov.name end,
    s.requires_project_stage_lead,
    sl.user_id,
    nullif(btrim(concat_ws(' ', slp.first_name, slp.last_name)), '')
  from project_processes pp
  join process_stages s on s.template_id = pp.template_id
  left join process_stage_role_responsibility r on r.stage_id = s.id and r.is_glowny
  left join role ro on ro.code = r.role_code
  left join resolved res on res.start_role = r.role_code
  left join role cov on cov.code = res.covered_by
  left join profiles p on p.id = res.user_id
  left join project_stage_leads sl on sl.project_id = pp.project_id and sl.stage_id = s.id::text
  left join profiles slp on slp.id = sl.user_id
  where pp.project_id = p_project_id
  order by s.position;
$$;

comment on function public.report_stage_responsible is
  'D42 — odpowiedzialny za etap: macierz (is_glowny) -> project_role_slot -> lancuch role_fallback. '
  'Lider etapu zwracany osobno, to inna rola. Jedno zrodlo dla wszystkich miejsc wyswietlania.';

grant execute on function public.report_stage_responsible(uuid) to authenticated;
revoke execute on function public.report_stage_responsible(uuid) from public, anon;

do $$
declare
  v_projekt uuid;
  v_osoba uuid;
  v_slot uuid;
  v_bez_pokrycia integer;
  v_fallback integer;
  v_pokryte integer;
  v_zla_rola integer;
  v_zostalo integer;
begin
  ---------------------------------------------------------------------------
  -- 1. Stan zastany. Zadne zywe dane NIE cwicza dzis fallbacku: jedyny projekt
  --    z dziurami (Borkowska) ma nieobsadzonego projektanta, ktorego fallback
  --    wskazuje na koordynatora technicznego — rowniez nieobsadzonego i bez
  --    dalszego ogniwa. Lancuch dochodzi do konca bez pokrycia, i to poprawnie.
  ---------------------------------------------------------------------------
  create temp table _chk on commit drop as
  select p.id as project_id, x.*
  from projects p
  cross join lateral report_stage_responsible(p.id) x;

  select count(*) into v_bez_pokrycia from _chk where role_code is not null and responsible_user_id is null;
  select count(*) into v_fallback from _chk where slot_source = 'fallback';

  if v_bez_pokrycia <> 6 then
    raise exception 'Oczekiwano 6 etapow bez pokrycia (stan zastany), jest %', v_bez_pokrycia;
  end if;
  if v_fallback <> 0 then
    raise exception 'Zywe dane nie powinny dzis dawac pokrycia fallbackiem, jest %', v_fallback;
  end if;

  ---------------------------------------------------------------------------
  -- 2. Skoro dane nie cwicza lancucha, wymuszamy go fikstuura W TEJ SAMEJ
  --    transakcji: obsadzamy koordynatora technicznego na Borkowskiej i zadamy,
  --    zeby projektant (etap_02, etap_03) rozwiazal sie NA NIEGO, ze zrodlem
  --    'fallback' i wskazana rola zastepujaca. Bez tego poprawka bylaby
  --    mechanizmem, ktorego nikt nigdy nie sprawdzil.
  --    (uses_project_slot to kolumna generowana — nie podajemy jej w insercie)
  ---------------------------------------------------------------------------
  select p.id into v_projekt from projects p where p.name = 'Borkowska' limit 1;
  if v_projekt is null then
    raise exception 'Brak projektu Borkowska — asercja fikstuurowa nie ma na czym dzialac.';
  end if;

  select prs.user_id into v_osoba
  from project_role_slot prs
  where prs.project_id = v_projekt and prs.role_code = 'opiekun_projektu' and prs.to_date is null
  limit 1;
  if v_osoba is null then
    raise exception 'Borkowska nie ma obsadzonego opiekuna — brak osoby do fikstuury.';
  end if;

  insert into project_role_slot (project_id, role_code, user_id, source)
  values (v_projekt, 'koordynator_techniczny', v_osoba, 'obsada')
  returning id into v_slot;

  select
    count(*) filter (where stage_code in ('etap_02','etap_03')
                       and slot_source = 'fallback'
                       and responsible_user_id = v_osoba),
    count(*) filter (where stage_code in ('etap_02','etap_03')
                       and covered_by_role_code is distinct from 'koordynator_techniczny')
  into v_pokryte, v_zla_rola
  from report_stage_responsible(v_projekt);

  if v_pokryte <> 2 then
    raise exception 'Fallback nie pokryl projektanta: oczekiwano 2 etapow, jest %', v_pokryte;
  end if;
  if v_zla_rola <> 0 then
    raise exception 'Fallback pokryl, ale wskazal zla role zastepujaca (% etapow)', v_zla_rola;
  end if;

  ---------------------------------------------------------------------------
  -- 3. Sprzatanie fikstuury i dowod, ze posprzatalo.
  ---------------------------------------------------------------------------
  delete from project_role_slot where id = v_slot;
  select count(*) into v_zostalo from project_role_slot where id = v_slot;
  if v_zostalo <> 0 then
    raise exception 'Fikstuura nie zostala usunieta — przerywam, zeby nie zostawic falszywej obsady.';
  end if;

  raise notice 'OK: stan zastany 6 bez pokrycia / 0 fallback; lancuch fallbacku zweryfikowany fikstuura.';
end $$;
