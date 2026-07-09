-- ═══════════════════════════════════════════════════════════════════════════
-- Plan Zasobów — Etap 3: rozszerzenie etapów procesu.
-- Etap procesu staje się źródłem prawdy dla planowania: role, kompetencje,
-- liczba osób, czas, roboczogodziny, budżety, ryzyko, zależności.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.process_stages
  add column if not exists min_people_count integer not null default 1,
  add column if not exists optimal_people_count integer,
  add column if not exists estimated_duration_days numeric,
  add column if not exists estimated_labor_hours numeric,
  add column if not exists default_labor_budget numeric,
  add column if not exists default_material_budget numeric,
  add column if not exists default_risk_item_id uuid references public.resource_dictionary_items (id) on delete set null,
  add column if not exists can_run_in_parallel boolean not null default false,
  add column if not exists requires_leader boolean not null default false,
  add column if not exists allows_trainee boolean not null default true;

-- ── Wymagane role na etapie (wiele-do-wielu, z minimalną liczbą osób) ────────
create table if not exists public.process_stage_role_requirements (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.process_stages (id) on delete cascade,
  role_item_id uuid not null references public.resource_dictionary_items (id) on delete cascade,
  min_count integer not null default 1,
  created_at timestamptz not null default now(),
  unique (stage_id, role_item_id)
);

create index if not exists process_stage_role_requirements_stage_idx
  on public.process_stage_role_requirements (stage_id);

-- ── Wymagane kompetencje na etapie (z minimalnym poziomem) ───────────────────
create table if not exists public.process_stage_competency_requirements (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.process_stages (id) on delete cascade,
  competency_item_id uuid not null references public.resource_dictionary_items (id) on delete cascade,
  min_level_item_id uuid references public.resource_dictionary_items (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (stage_id, competency_item_id)
);

create index if not exists process_stage_competency_requirements_stage_idx
  on public.process_stage_competency_requirements (stage_id);

-- ── Zależności między etapami tego samego szablonu ───────────────────────────
create table if not exists public.process_stage_dependencies (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.process_stages (id) on delete cascade,
  depends_on_stage_id uuid not null references public.process_stages (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (stage_id, depends_on_stage_id),
  check (stage_id <> depends_on_stage_id)
);

create index if not exists process_stage_dependencies_stage_idx
  on public.process_stage_dependencies (stage_id);

-- ── RLS: te tabele dziedziczą charakter "konfiguracji procesu" — odczyt dla
-- zalogowanych, zapis dla administrator/manager (edytorzy szablonów procesu) ─
alter table public.process_stage_role_requirements enable row level security;
alter table public.process_stage_competency_requirements enable row level security;
alter table public.process_stage_dependencies enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'process_stage_role_requirements', 'process_stage_competency_requirements', 'process_stage_dependencies'
  ] loop
    execute format('drop policy if exists %I on public.%I;', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select using (auth.uid() is not null);',
      t || '_select', t
    );
    execute format('drop policy if exists %I on public.%I;', t || '_write', t);
    execute format(
      'create policy %I on public.%I for all using (public.has_full_app_access()) with check (public.has_full_app_access());',
      t || '_write', t
    );
  end loop;
end $$;
