-- Usuń etap ofertowania — istniejące wpisy przenieś do wstępnego planowania.
update public.inspections
set status = 'preliminary'
where status = 'quoting';

alter table public.inspections
  drop constraint if exists inspections_status_check;

alter table public.inspections
  add constraint inspections_status_check
  check (
    status in ('preliminary', 'planned', 'completed', 'billing', 'settled')
  );
