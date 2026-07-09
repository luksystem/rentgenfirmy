-- ═══════════════════════════════════════════════════════════════════════════
-- Plan Zasobów — Etap 2: rozszerzenie użytkownika (profiles).
-- Nie tworzymy osobnego modelu pracownika — wykorzystujemy istniejące profiles.
-- Role operacyjne, kompetencje, zespoły to wielo-do-wielu do resource_dictionary_items.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists daily_hours_limit numeric,
  add column if not exists weekly_hours_limit numeric,
  add column if not exists base_location text not null default '',
  add column if not exists cost_rate numeric,
  add column if not exists is_available_for_planning boolean not null default true;

-- ── Role operacyjne użytkownika (wiele-do-wielu) ────────────────────────────
create table if not exists public.user_operational_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_item_id uuid not null references public.resource_dictionary_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role_item_id)
);

create index if not exists user_operational_roles_user_idx on public.user_operational_roles (user_id);
create index if not exists user_operational_roles_role_idx on public.user_operational_roles (role_item_id);

-- ── Kompetencje użytkownika + poziom ─────────────────────────────────────────
create table if not exists public.user_competencies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  competency_item_id uuid not null references public.resource_dictionary_items (id) on delete cascade,
  level_item_id uuid references public.resource_dictionary_items (id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, competency_item_id)
);

create index if not exists user_competencies_user_idx on public.user_competencies (user_id);
create index if not exists user_competencies_competency_idx on public.user_competencies (competency_item_id);

-- ── Przynależność do zespołu/zespołów ────────────────────────────────────────
create table if not exists public.user_teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  team_item_id uuid not null references public.resource_dictionary_items (id) on delete cascade,
  is_lead boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, team_item_id)
);

create index if not exists user_teams_user_idx on public.user_teams (user_id);
create index if not exists user_teams_team_idx on public.user_teams (team_item_id);

-- ── Certyfikaty (opcjonalne) ─────────────────────────────────────────────────
create table if not exists public.user_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  issued_at date,
  expires_at date,
  file_url text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_certificates_user_idx on public.user_certificates (user_id);

-- ── Nieobecności ──────────────────────────────────────────────────────────────
create table if not exists public.user_absences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  absence_type_item_id uuid references public.resource_dictionary_items (id) on delete set null,
  start_date date not null,
  end_date date not null,
  note text not null default '',
  status text not null default 'confirmed' check (status in ('planned', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists user_absences_user_idx on public.user_absences (user_id, start_date, end_date);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.user_operational_roles enable row level security;
alter table public.user_competencies enable row level security;
alter table public.user_teams enable row level security;
alter table public.user_certificates enable row level security;
alter table public.user_absences enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'user_operational_roles', 'user_competencies', 'user_teams', 'user_certificates', 'user_absences'
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
