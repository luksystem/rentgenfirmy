-- D19 SS2a: "przedluzenie/umowa serwisowa = nowy rekord z datami od-do, nigdy edycja pierwotnej
-- gwarancji". Znaleziono dwa miejsca lamiace to wprost: respondToProjectAgreementLegacy
-- (project-agreement-repository.ts) i applyWarrantyIfAccepted (project-agreement-collaboration-
-- repository.ts) - oba przy akceptacji Ustalenia kategorii 'warranty' robily bezposredni
-- UPDATE projects.warranty_ends_at, nadpisujac pierwotny fakt.
--
-- RPC zamiast bezposredniego INSERT do project_coverage_periods: polityka INSERT na tej tabeli
-- wymaga has_full_app_access() (Faza 6, zamierzone dla recznego dopisywania pokrycia przez zespol),
-- ale akceptacja Ustalenia przychodzi tez z panelu klienta (anon-key, brak sesji zespolu) -
-- SECURITY DEFINER omija to bezpiecznie, bo funkcja sama wewnetrznie sprawdza, ze agreement
-- istnieje, jest kategorii warranty i jest accepted, wiec nie da sie jej naduzyc do wpisania
-- dowolnego pokrycia.
create or replace function public.apply_warranty_extension_from_agreement(p_agreement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_ends_at date;
  v_starts_at date;
begin
  select project_id, proposed_warranty_end_date into v_project_id, v_ends_at
  from project_client_agreements
  where id = p_agreement_id and category = 'warranty' and status = 'accepted';

  if v_project_id is null or v_ends_at is null then
    return;
  end if;

  select coalesce(
    (select max(ends_at) from project_coverage_periods where project_id = v_project_id),
    (select warranty_ends_at::date from projects where id = v_project_id),
    (select (system_handover_at::date + (coalesce(warranty_duration_months, 0) || ' months')::interval)::date
     from projects where id = v_project_id and system_handover_at is not null),
    current_date
  ) into v_starts_at;

  insert into project_coverage_periods (project_id, kind, starts_at, ends_at, source_ref, note)
  values (
    v_project_id,
    'przedluzenie',
    v_starts_at,
    v_ends_at,
    p_agreement_id::text,
    'Automatycznie z zaakceptowanego Ustalenia (przedłużenie gwarancji).'
  );
end;
$$;

comment on function public.apply_warranty_extension_from_agreement is
  'Faza 7/D26 - zastepuje bezposredni UPDATE projects.warranty_ends_at przy akceptacji Ustalenia '
  'kategorii warranty (docs/08 D19 SS2a: "nowy rekord, nigdy edycja pierwotnej"). Wolane z '
  'project-agreement-repository.ts i project-agreement-collaboration-repository.ts, z obu sciezek '
  '(zespol i panel klienta) - stad grant dla anon.';

grant execute on function public.apply_warranty_extension_from_agreement(uuid) to authenticated, anon;
