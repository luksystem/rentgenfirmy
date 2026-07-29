-- Krok B B7 (docs/08 D27/D28) - "Zaplanuj": zamiana zobowiazania w blok resource_plan_items.
-- process_item_id - analogicznie do inspection_id (jedyny dzialajacy dzis precedens "link do
-- zewnetrznego zrodla"; task_id na tej tabeli jest martwym polem, nigdy nie synchronizowanym).
alter table public.resource_plan_items
  add column process_item_id uuid references public.project_process_items(id);

create unique index resource_plan_items_process_item_id_idx
  on public.resource_plan_items (process_item_id) where process_item_id is not null;

comment on column public.resource_plan_items.process_item_id is
  'Krok B (docs/08 D28) - blok zmaterializowany z zobowiazania (project_process_items z lead_days).
  Jeden blok na zobowiazanie (unique index). NULL = blok powstal inna droga (recznie/z szablonu).';

-- Blok UKONCZONEGO zobowiazania NIE znika i NIE przesuwa sie dalej - zostaje jako fakt historyczny
-- (wlasciciel: inaczej obciazenie historyczne przelicza sie wstecz, tracimy dane do kalibracji
-- lead_days). Status synchronizowany do "Zakonczone" w slowniku plan_status, zeby bylo widac w
-- Gantcie, ze to zamkniete, bez usuwania wiersza.
create or replace function public.sync_resource_plan_item_status_on_item_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status_item_id uuid;
begin
  if new.data_ukonczenia is distinct from old.data_ukonczenia then
    if new.data_ukonczenia is not null then
      select id into v_status_item_id
      from resource_dictionary_items
      where dictionary_key = 'plan_status' and name = 'Zakończone'
      limit 1;

      update resource_plan_items
      set status_item_id = v_status_item_id, updated_at = now()
      where process_item_id = new.id;
    else
      update resource_plan_items
      set status_item_id = null, updated_at = now()
      where process_item_id = new.id;
    end if;
  end if;
  return new;
end;
$$;

create trigger project_process_items_sync_plan_status_on_completion
  after update of data_ukonczenia on public.project_process_items
  for each row execute function public.sync_resource_plan_item_status_on_item_completion();

-- Rozszerzenie kaskady z A3 (docs/08 D28 2.4 B7 uzupelnienie b): przesuniecie kamienia musi ruszac
-- TEZ zmaterializowany blok w resource_plan_items, inaczej po pierwszym przesunieciu blok stoi w
-- starym terminie, a zobowiazanie ma nowy - i rozjezdzaja sie bez ostrzezenia. Blok UKONCZONEGO
-- zobowiazania (data_ukonczenia wypelnione) NIE jest ruszany - to juz historia.
create or replace function public.recompute_derived_deadlines(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_new_termin date;
  v_delta_days integer;
begin
  for r in
    select
      ppi.id,
      ppi.data_planowana,
      ppi.termin_wynikajacy,
      ppi.data_ukonczenia,
      (pp.milestone_dates ->> pi.milestone_id::text)::date as milestone_date,
      pi.lead_days
    from project_process_items ppi
    join process_items pi on pi.id = ppi.template_item_id
    join project_processes pp on pp.project_id = ppi.project_id
    where ppi.project_id = p_project_id
      and pi.lead_days is not null
  loop
    v_new_termin := case
      when r.milestone_date is null then null
      else (r.milestone_date - (r.lead_days || ' days')::interval)::date
    end;

    if v_new_termin is not distinct from r.termin_wynikajacy then
      continue;
    end if;

    if r.data_planowana is not null and r.termin_wynikajacy is not null and v_new_termin is not null then
      v_delta_days := v_new_termin - r.termin_wynikajacy;
      update project_process_items
      set termin_wynikajacy = v_new_termin, data_planowana = r.data_planowana + v_delta_days
      where id = r.id;

      if r.data_ukonczenia is null then
        update resource_plan_items
        set start_at = start_at + (v_delta_days || ' days')::interval,
            end_at = end_at + (v_delta_days || ' days')::interval,
            updated_at = now()
        where process_item_id = r.id;
      end if;
    else
      update project_process_items
      set termin_wynikajacy = v_new_termin
      where id = r.id;
    end if;
  end loop;
end;
$$;

comment on function public.recompute_derived_deadlines is
  'Krok A/B (docs/08 D27 2.1/2.3, D28 B7b) - przelicza termin_wynikajacy + kaskada data_planowana
  PLUS zmaterializowany blok w resource_plan_items (process_item_id), o ile zobowiazanie nie jest
  jeszcze ukonczone. Idempotentna.';
