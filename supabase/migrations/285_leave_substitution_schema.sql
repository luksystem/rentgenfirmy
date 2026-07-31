-- Faza 13 Krok 1 (docs/role/04 §6.1, §6.2) - model danych wyzwalacza walidacji i listy pokrycia.

-- §6.1: fakty per slot trzymany przez wnioskujacego, do decyzji w TS (lib/leave/substitution-trigger.ts).
-- Warunek "urlop > 2 dni robocze" NIE jest tu liczony (nie zalezy od slotu/projektu - liczy go
-- countLeaveWorkingDays w TS, jak dzis). Warunek "brama INTENSYWNA/KRYTYCZNA" tez zyje w TS, bo
-- resolveCommunicationGate juz istnieje, jest przetestowany (D45/11a) i NIE duplikujemy go w SQL.
create or replace function public.report_leave_substitution_slot_facts(
  p_profile_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  project_id uuid,
  project_name text,
  role_code text,
  milestone_overlap boolean
)
language sql
stable
set search_path = public
as $$
  with held_slots as (
    select prs.project_id, p.name as project_name, prs.role_code
    from project_role_slot prs
    join projects p on p.id = prs.project_id
    where prs.user_id = p_profile_id and prs.to_date is null
  ),
  active_stage as (
    select hs.project_id, hs.project_name, hs.role_code, ps.id as stage_id
    from held_slots hs
    join project_processes pp on pp.project_id = hs.project_id
    join process_stages ps on ps.id::text = pp.active_stage_id
  )
  -- LEFT JOIN celowy: slot bez rozwiazywalnego etapu aktywnego (szablon niespojny/projekt bez
  -- procesu) ma dac milestone_overlap=false, nie zniknac z wyniku - osoba i tak trzyma slot,
  -- warunki 1/2 z §6.1 moga go objac niezaleznie od kamieni milowych.
  select
    hs.project_id,
    hs.project_name,
    hs.role_code,
    exists (
      select 1
      from process_stage_role_responsibility psr
      join process_milestones ms on ms.stage_id = a.stage_id
      join process_items pi on pi.milestone_id = ms.id and pi.lead_days is not null
      join project_process_items ppi on ppi.project_id = a.project_id and ppi.template_item_id = pi.id
      where psr.stage_id = a.stage_id
        and psr.role_code = a.role_code
        and psr.is_glowny = true
        and ppi.data_ukonczenia is null
        and ppi.termin_wynikajacy is not null
        and ppi.termin_wynikajacy between p_start_date and p_end_date
    ) as milestone_overlap
  from held_slots hs
  left join active_stage a on a.project_id = hs.project_id and a.role_code = hs.role_code;
$$;

comment on function public.report_leave_substitution_slot_facts is
  'Faza 13 Krok 1 (/docs/role/04 §6.1) - per slot trzymany przez wnioskujacego: czy nachodzi na '
  'kamien milowy, za ktory ta rola odpowiada glownie. Progi dni i brama komunikacyjna licza sie w TS.';

grant execute on function public.report_leave_substitution_slot_facts(uuid, date, date) to authenticated;
revoke execute on function public.report_leave_substitution_slot_facts(uuid, date, date) from public, anon;

-- §6.2: lista slotow do pokrycia per wniosek urlopowy.
alter table public.leave_requests
  add column requires_substitution_planning boolean not null default false;

comment on column public.leave_requests.requires_substitution_planning is
  'Faza 13 Krok 1 (/docs/role/04 §6.1) - true gdy przynajmniej jeden trzymany slot spelnia '
  'warunek walidacji. Nie blokuje wniosku - tylko wlacza przeplyw listy pokrycia (§6.2).';

create table public.leave_substitution_slot (
  id uuid primary key default gen_random_uuid(),
  leave_request_id uuid not null references public.leave_requests (id) on delete cascade,
  project_id uuid not null references public.projects (id),
  role_code text not null references public.role (code),
  status text not null default 'proponowany'
    check (status in ('proponowany', 'skorygowany', 'zaakceptowany', 'luka')),
  proposed_user_id uuid references public.profiles (id),
  proposed_via text check (proposed_via in ('fallback', 'ranking')),
  selected_user_id uuid references public.profiles (id),
  gap_reason text,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (leave_request_id, project_id, role_code)
);

comment on table public.leave_substitution_slot is
  'Faza 13 Krok 1 (/docs/role/04 §6.2) - lista slotow do pokrycia na okres urlopu. proposed_user_id/'
  'proposed_via to domyslna propozycja (fallback albo ranking), selected_user_id to wybor po '
  'ewentualnej korekcie wnioskujacego. status=luka gdy brak kandydata (gap_reason nazywa brak wprost, '
  '"brak osoby z kompetencja X >= poziom Y", nie "brak kandydatow") - wniosek NIE jest blokowany.';

create index leave_substitution_slot_request_idx on public.leave_substitution_slot (leave_request_id);

alter table public.leave_substitution_slot enable row level security;

create policy leave_substitution_slot_select on public.leave_substitution_slot
  for select using (auth.uid() is not null);

create policy leave_substitution_slot_write on public.leave_substitution_slot
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
