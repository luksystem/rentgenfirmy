-- Poprawka nazwy z migracji 221 (docs/08 D21) - "role_competency" kolidowalo z role.code
-- (9 kodow D10, project_role_slot), mimo ze tabela kluczuje na zupelnie inny byt
-- (resource_dictionary_items dictionary_key='operational_role'). Ta sama pulapka co
-- requires_leader/requires_stage_lead. Nowa nazwa: operational_role_competency.

alter table public.role_competency rename to operational_role_competency;

alter table public.operational_role_competency
  rename constraint role_competency_pkey to operational_role_competency_pkey;
alter table public.operational_role_competency
  rename constraint role_competency_role_item_id_competency_item_id_key
  to operational_role_competency_role_item_id_competency_item_id_key;
alter table public.operational_role_competency
  rename constraint role_competency_role_item_id_fkey to operational_role_competency_role_item_id_fkey;
alter table public.operational_role_competency
  rename constraint role_competency_competency_item_id_fkey to operational_role_competency_competency_item_id_fkey;
alter table public.operational_role_competency
  rename constraint role_competency_min_level_item_id_fkey to operational_role_competency_min_level_item_id_fkey;

alter index role_competency_role_idx rename to operational_role_competency_role_idx;
alter index role_competency_competency_idx rename to operational_role_competency_competency_idx;

alter policy role_competency_select on public.operational_role_competency rename to operational_role_competency_select;
alter policy role_competency_write on public.operational_role_competency rename to operational_role_competency_write;

create or replace function public.report_competency_gap_map()
returns table (
  kind text,
  subject_label text,
  competency_label text,
  required_level_label text,
  qualified_people_count integer
)
language sql
stable
set search_path = public
as $$
  with top_level as (
    select id, name
    from resource_dictionary_items
    where dictionary_key = 'competency_level' and is_active
    order by sort_order desc
    limit 1
  ),
  role_gaps as (
    select
      'rola'::text as kind,
      ri.name as subject_label,
      ci.name as competency_label,
      tl.name as required_level_label,
      count(distinct uc.user_id)::integer as qualified_people_count
    from operational_role_competency rc
    join resource_dictionary_items ri on ri.id = rc.role_item_id
    join resource_dictionary_items ci on ci.id = rc.competency_item_id
    cross join top_level tl
    left join user_competencies uc
      on uc.competency_item_id = rc.competency_item_id
     and uc.level_item_id = tl.id
    group by ri.name, ci.name, tl.name
    having count(distinct uc.user_id) < 2
  ),
  stage_gaps as (
    select
      'etap'::text as kind,
      ps.title as subject_label,
      ci.name as competency_label,
      tl.name as required_level_label,
      count(distinct uc.user_id)::integer as qualified_people_count
    from process_stage_competency_requirements scr
    join process_stages ps on ps.id = scr.stage_id
    join resource_dictionary_items ci on ci.id = scr.competency_item_id
    cross join top_level tl
    left join user_competencies uc
      on uc.competency_item_id = scr.competency_item_id
     and uc.level_item_id = tl.id
    group by ps.title, ci.name, tl.name
    having count(distinct uc.user_id) < 2
  )
  select * from role_gaps
  union all
  select * from stage_gaps
  order by kind, subject_label, competency_label;
$$;

comment on function public.report_competency_gap_map is
  'Mapa luk kompetencji (docs/role/04 3.3, Faza 3 PROMPT 4 pkt 4). Role (operational_role_competency) '
  'i etapy (process_stage_competency_requirements), dla ktorych mniej niz dwie osoby maja wymagana '
  'kompetencje na najwyzszym zdefiniowanym poziomie (resource_dictionary_items '
  'dictionary_key=competency_level, max sort_order). Brak wiersza = brak zdefiniowanego wymagania, '
  'nie brak luki.';

comment on table public.operational_role_competency is
  'Wymagane kompetencje dla funkcji wykonawczej (resource_dictionary_items dictionary_key=operational_role) '
  'w Planie Zasobow - NIE dla role.code (9 kodow D10, project_role_slot). Docs/08 D21/D22: trzy osobne '
  'osie "rola" w tym systemie - role.code (odpowiedzialnosc za projekt), operational_role (funkcja '
  'wykonawcza na zadaniu - to, co kwalifikuje ta tabela), competency (umiejetnosc z poziomem).';
