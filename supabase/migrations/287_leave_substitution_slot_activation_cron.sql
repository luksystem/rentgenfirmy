-- Faza 13 Krok 1 (docs/role/04 §6.2 pkt 4) - aktywacja/powrot slotu zastepstwa na dni graniczne.
--
-- Spec zakazuje AUTOMATYZOWAC powrotu slotu WYLACZNIE po przejeciu przy czerwonym (docs/role/04
-- §9: "nie automatyzowac powrotu slotu po przejeciu przy czerwonym"). Dla zastepstwa urlopowego
-- data konca jest znana i zatwierdzona juz przy akceptacji karty przekazania - automatyzacja
-- powrotu jest tu bezpieczna i konieczna (nikt nie bedzie recznie odwracac setek slotow po kazdym
-- urlopie). Wzorzec identyczny jak recompute_project_flow_status (228) - czysta funkcja SQL na
-- cronie, bez HTTP hop (brak powiadomien do wyslania na tym etapie).
--
-- Zwrot NIE wymaga osobnej tabeli "kto byl wczesniej": posiadaczem sprzed zastepstwa jest zawsze
-- leave_requests.profile_id (wnioskujacy trzymal slot, bo inaczej nie wygenerowalby sie wpis w
-- leave_substitution_slot - patrz report_leave_substitution_slot_facts, warunek held_slots).
create or replace function public.activate_leave_substitution_slots()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select lss.id as slot_id, lss.project_id, lss.role_code, lss.selected_user_id,
           lr.id as leave_request_id, lr.start_date, lr.end_date
    from leave_substitution_slot lss
    join leave_requests lr on lr.id = lss.leave_request_id
    where lss.status = 'zaakceptowany'
      and lss.selected_user_id is not null
      and lr.status = 'approved'
      and lr.start_date <= current_date
      and lr.end_date >= current_date
      and not exists (
        select 1 from project_role_slot prs
        where prs.source_ref = lr.id::text
          and prs.project_id = lss.project_id
          and prs.role_code = lss.role_code
          and prs.source = 'zastepstwo'
      )
  loop
    update project_role_slot
    set to_date = r.start_date - 1
    where project_id = r.project_id and role_code = r.role_code and to_date is null;

    insert into project_role_slot (project_id, role_code, user_id, from_date, to_date, source, source_ref)
    values (r.project_id, r.role_code, r.selected_user_id, r.start_date, null, 'zastepstwo', r.leave_request_id::text);
  end loop;
end;
$$;

comment on function public.activate_leave_substitution_slots is
  'Faza 13 Krok 1 (/docs/role/04 §6.2 pkt 4) - w dniu startu urlopu (albo pierwszym cronie po nim):
  zamyka oryginalny slot, otwiera source=zastepstwo. Idempotentne (NOT EXISTS po source_ref).';

create or replace function public.revert_leave_substitution_slots()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select prs.project_id, prs.role_code, prs.source_ref, lr.id as leave_request_id,
           lr.profile_id, lr.end_date
    from project_role_slot prs
    join leave_requests lr on lr.id::text = prs.source_ref
    where prs.source = 'zastepstwo'
      and prs.to_date is null
      and lr.end_date < current_date
      and not exists (
        select 1 from project_role_slot prs2
        where prs2.source_ref = prs.source_ref
          and prs2.project_id = prs.project_id
          and prs2.role_code = prs.role_code
          and prs2.source = 'obsada'
      )
  loop
    update project_role_slot
    set to_date = r.end_date
    where project_id = r.project_id and role_code = r.role_code
      and source = 'zastepstwo' and source_ref = r.source_ref and to_date is null;

    insert into project_role_slot (project_id, role_code, user_id, from_date, to_date, source, source_ref)
    values (r.project_id, r.role_code, r.profile_id, r.end_date + 1, null, 'obsada', r.leave_request_id::text);
  end loop;
end;
$$;

comment on function public.revert_leave_substitution_slots is
  'Faza 13 Krok 1 (/docs/role/04 §6.2 pkt 4) - dzien po koncu urlopu (albo pierwszym cronie po nim):
  zamyka slot zastepstwa, przywraca wnioskujacego jako source=obsada. Idempotentne.';

create or replace function public.trigger_leave_substitution_activation_cron()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.activate_leave_substitution_slots();
  perform public.revert_leave_substitution_slots();
end;
$$;

revoke all on function public.activate_leave_substitution_slots() from public;
revoke all on function public.revert_leave_substitution_slots() from public;
revoke all on function public.trigger_leave_substitution_activation_cron() from public;
grant execute on function public.trigger_leave_substitution_activation_cron() to postgres;

do $do$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'leave-substitution-activation';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$do$;

-- 03:45 UTC - PO recompute-project-flow-status (03:00) i PRZED warranty-review-due/
-- commitment-warnings (04:30) - slot ma byc przepiety, zanim pozniejsze crony dnia przeczytaja
-- stan obsady.
select cron.schedule(
  'leave-substitution-activation',
  '45 3 * * *',
  'select public.trigger_leave_substitution_activation_cron();'
);
