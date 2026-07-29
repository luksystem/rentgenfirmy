-- Krok A (Terminy pochodne elementow procesu), docs/08 D27 2.1-2.2. A1: atrybuty szablonu.
-- A2: kolumny instancji. Oba NULL-owalne, generyczne - dziala niezaleznie od tego, ile elementow
-- ma dzis lead_days ustawione (dzis: zero, patrz D27 - Etapy 2-6 szablonu DOM sa puste tresciowo).

alter table public.process_items
  add column lead_days integer,
  add column effort_days integer;

comment on column public.process_items.lead_days is
  'Krok A (docs/08 D27) - ile dni przed kamieniem milowym element musi byc gotowy. Obejmuje tez to, '
  'co PO elemencie musi sie jeszcze wydarzyc (nie tylko czas jego wlasnej roboty - patrz effort_days). '
  'NULL = element nie uczestniczy w terminach pochodnych. Atrybut szablonu (D1), nieedytowalny per '
  'projekt. Edytor: components/process/process-template-editor.tsx.';
comment on column public.process_items.effort_days is
  'Krok A - ile realnie dni zajmuje wykonanie elementu. Rozne od lead_days. Uzywane do progu '
  'ostrzezenia (Krok B: okno < effort_days) i materializacji bloku w planie zasobow ("Zaplanuj").';

alter table public.project_process_items
  add column termin_wynikajacy date,
  add column data_planowana date,
  add column data_ukonczenia timestamptz;

comment on column public.project_process_items.termin_wynikajacy is
  'Krok A - wyliczany, NIGDY nieedytowalny bezposrednio. = data wlasnego milestone''a elementu '
  '(project_processes.milestone_dates[process_items.milestone_id]) minus process_items.lead_days. '
  'NULL, gdy brak lead_days na elemencie lub brak ustawionej daty kamienia. Utrzymywany przez '
  'recompute_derived_deadlines() + trigger na project_processes.milestone_dates.';
comment on column public.project_process_items.data_planowana is
  'Krok A - kiedy faktycznie zaplanowano robote. NULL dopoki ktos swiadomie nie zaplanuje ("termin '
  'istnieje, nikt nie zdecydowal kiedy"). Domyslnie = termin_wynikajacy w momencie pierwszego '
  'ustawienia (UI), potem trzyma sie wlasnej wartosci - przesuniecie kamienia przesuwa ja razem, '
  'zachowujac odstep (patrz recompute_derived_deadlines). BLOKADA zapisu (trigger), gdy >= data '
  'kamienia - nie da sie zaplanowac testu po dostawie.';
comment on column public.project_process_items.data_ukonczenia is
  'Krok A - ZRODLO PRAWDY faktycznego wykonania (docs/08 D27 2.2). project_processes.completions '
  '(jsonb) zostaje jako cache dla istniejacego pipeline''u, wypelniany Z TEJ kolumny, nie odwrotnie.';

-- ---------------------------------------------------------------------------
-- A3: funkcja wyliczajaca + trigger na zmiane milestone_dates + kaskada data_planowana
-- (zachowanie odstepu przy przesunieciu kamienia).
-- ---------------------------------------------------------------------------
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
    else
      update project_process_items
      set termin_wynikajacy = v_new_termin
      where id = r.id;
    end if;
  end loop;
end;
$$;

comment on function public.recompute_derived_deadlines is
  'Krok A (D27 2.1/2.3) - przelicza termin_wynikajacy dla wszystkich elementow projektu z '
  'ustawionym lead_days. Gdy kamien sie przesuwa i data_planowana byla juz ustawiona - przesuwa ja '
  'o te sama delte (zachowanie odstepu), zamiast resetowac. Idempotentna - bezpieczna do wywolania '
  'wielokrotnie (pomija elementy, ktorych termin sie nie zmienil).';

create or replace function public.recompute_deadlines_on_milestone_date_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.milestone_dates is distinct from old.milestone_dates then
    perform public.recompute_derived_deadlines(new.project_id);
  end if;
  return new;
end;
$$;

create trigger project_processes_recompute_deadlines
  after update on public.project_processes
  for each row execute function public.recompute_deadlines_on_milestone_date_change();

create or replace function public.recompute_deadlines_on_item_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_derived_deadlines(new.project_id);
  return new;
end;
$$;

create trigger project_process_items_recompute_deadlines_on_insert
  after insert on public.project_process_items
  for each row execute function public.recompute_deadlines_on_item_insert();

-- Reguly przesuwania (D27 2.3): tylko BLOKADA jest twarda (data_planowana >= data kamienia).
-- Ostrzezenie (termin_wynikajacy < data_planowana < kamien) to sygnal do UI/raportu, nie zapis.
create or replace function public.validate_project_process_item_data_planowana()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_milestone_date date;
begin
  if new.data_planowana is null then
    return new;
  end if;

  select (pp.milestone_dates ->> pi.milestone_id::text)::date
    into v_milestone_date
  from process_items pi
  join project_processes pp on pp.project_id = new.project_id
  where pi.id = new.template_item_id;

  if v_milestone_date is not null and new.data_planowana >= v_milestone_date then
    raise exception 'data_planowana (%) nie moze wypadac na dzien kamienia milowego lub po nim (%)',
      new.data_planowana, v_milestone_date;
  end if;

  return new;
end;
$$;

create trigger project_process_items_validate_data_planowana
  before insert or update of data_planowana on public.project_process_items
  for each row execute function public.validate_project_process_item_data_planowana();
