-- Faza 6 (Cykl zycia projektu), docs/08 D19 par.2a.
-- Append-only fakty pokrycia (gwarancja/przedluzenie/umowa serwisowa) - nigdy edycja pierwotnej
-- gwarancji, kazde przedluzenie to nowy wiersz. viz_service_contracts NIE jest tym bytem (scoped
-- do klientow BMS przez viz_dashboards, nie ogolny mechanizm - zweryfikowane, D19).
create table public.project_coverage_periods (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  kind text not null check (kind in ('gwarancja_pierwotna', 'przedluzenie', 'umowa_serwisowa')),
  starts_at date not null,
  ends_at date not null,
  source_ref text,
  note text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index project_coverage_periods_project_idx on public.project_coverage_periods (project_id, starts_at, ends_at);

alter table public.project_coverage_periods enable row level security;

create policy project_coverage_periods_select on public.project_coverage_periods
  for select using (auth.uid() is not null);

-- Tylko SELECT/INSERT - append-only, celowo brak polityki UPDATE/DELETE (RLS domyslnie odmawia
-- polecen bez pasujacej polityki), zgodnie z "nigdy edycja pierwotnej gwarancji".
create policy project_coverage_periods_insert on public.project_coverage_periods
  for insert with check (has_full_app_access());

comment on table public.project_coverage_periods is
  'Fakty pokrycia serwisowego (docs/08 D19 par.2a) - append-only, uzywane przez formule statusu '
  'projektu (faza 6). Pierwotna gwarancja = jeden wiersz seedowany z projects.system_handover_at + '
  'warranty_duration_months; kazde przedluzenie/umowa to kolejny INSERT, nigdy edycja istniejacego.';

-- Seed pierwotnej gwarancji z istniejacych danych. Formula ends_at zgodna z
-- lib/project/warranty.ts::resolveProjectWarrantyEndsAt (preferuj juz policzone warranty_ends_at,
-- w przeciwnym razie handover + duration w miesiacach).
do $$
declare
  v_expected integer;
  v_inserted integer;
begin
  select count(*) into v_expected
  from projects
  where system_handover_at is not null
    and (warranty_ends_at is not null or coalesce(warranty_duration_months, 0) > 0);

  insert into project_coverage_periods (project_id, kind, starts_at, ends_at, note)
  select
    id,
    'gwarancja_pierwotna',
    system_handover_at,
    coalesce(warranty_ends_at, (system_handover_at + (warranty_duration_months || ' months')::interval)::date),
    'Seed z projects.system_handover_at + warranty_duration_months (migracja 227)'
  from projects
  where system_handover_at is not null
    and (warranty_ends_at is not null or coalesce(warranty_duration_months, 0) > 0);

  get diagnostics v_inserted = row_count;
  if v_inserted <> v_expected then
    raise exception 'Seed pokrycia: oczekiwano % wierszy, wstawiono %', v_expected, v_inserted;
  end if;
end $$;
