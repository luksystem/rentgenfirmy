-- ═══════════════════════════════════════════════════════════════════════════
-- Oceny miesięczne: samoocena pracownika + ocena przełożonego (dowolny
-- manager/administrator, bez wglądu w samoocenę przed złożeniem własnej oceny)
-- + raport AI zestawiający obie perspektywy + decyzja admina (zalążek
-- przyszłego modułu rozliczania pensji/premii — na razie tylko prosty,
-- rozszerzalny rekord decyzji, nie pełny system płacowy).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Przełącznik uczestnictwa w cyklu ocen (per pracownik) ────────────────────
alter table public.profiles
  add column if not exists monthly_review_enabled boolean not null default true;

update public.profiles set monthly_review_enabled = false where role = 'administrator';

comment on column public.profiles.monthly_review_enabled is
  'Czy pracownik uczestniczy w comiesięcznym cyklu samooceny / oceny przełożonego. Domyślnie wyłączone dla administratora.';

-- ── Enumy ─────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.monthly_review_ai_status as enum ('pending', 'ready', 'error');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.monthly_review_ai_source as enum ('ai', 'rules');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.monthly_review_decision_status as enum (
    'pending',
    'standard_bonus',
    'raise_consider',
    'talk_needed',
    'no_action',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- ── Funkcja pomocnicza RLS (wzorem public.is_administrator()) ────────────────
create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('administrator', 'manager')
      and is_active = true
  );
$$;

-- ── monthly_reviews — rodzic, jeden wiersz na pracownika × miesiąc ───────────
create table if not exists public.monthly_reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  period_month date not null,
  self_submitted_at timestamptz,
  manager_submitted_at timestamptz,
  manager_id uuid references public.profiles (id) on delete set null,
  ai_status public.monthly_review_ai_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, period_month),
  check (date_trunc('month', period_month)::date = period_month)
);

create index if not exists monthly_reviews_period_idx on public.monthly_reviews (period_month);
create index if not exists monthly_reviews_employee_idx on public.monthly_reviews (employee_id);

-- ── monthly_self_assessments ──────────────────────────────────────────────────
create table if not exists public.monthly_self_assessments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique references public.monthly_reviews (id) on delete cascade,
  employee_id uuid not null references public.profiles (id) on delete cascade,
  period_month date not null,
  rating smallint not null check (rating between 1 and 10),
  comment text not null default '',
  hours_context_snapshot jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  unique (employee_id, period_month)
);

comment on column public.monthly_self_assessments.hours_context_snapshot is
  'Zrzut podsumowania godzin (z fetchTimesheetSummaryServer) pokazanego pracownikowi w momencie wysyłki — audytowalność.';

-- ── monthly_manager_assessments ───────────────────────────────────────────────
create table if not exists public.monthly_manager_assessments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique references public.monthly_reviews (id) on delete cascade,
  employee_id uuid not null references public.profiles (id) on delete cascade,
  manager_id uuid not null references public.profiles (id),
  period_month date not null,
  rating smallint not null check (rating between 1 and 10),
  comment text not null default '',
  submitted_at timestamptz not null default now(),
  unique (employee_id, period_month)
);

comment on table public.monthly_manager_assessments is
  'Jednorazowa ocena przełożonego — pierwszy złożony wpis blokuje kolejne (unique employee_id+period_month). Reset tylko przez administratora (usunięcie wiersza przez API).';

-- ── monthly_review_ai_reports ─────────────────────────────────────────────────
create table if not exists public.monthly_review_ai_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique references public.monthly_reviews (id) on delete cascade,
  status public.monthly_review_ai_status not null default 'pending',
  source public.monthly_review_ai_source,
  report jsonb not null default '{}'::jsonb,
  error_message text not null default '',
  generated_at timestamptz,
  shared_with_employee_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.monthly_review_ai_reports.report is
  'Kształt: { summary, agreements: string[], discrepancies: string[], risks: string[], recommendation: { tier, label, rationale } }.';
comment on column public.monthly_review_ai_reports.shared_with_employee_at is
  'Null = raport niewidoczny dla pracownika. Ustawiane świadomą akcją administratora "Udostępnij pracownikowi" — nie automatycznie.';

-- ── monthly_review_decisions — zalążek przyszłego modułu płacowego ───────────
create table if not exists public.monthly_review_decisions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique references public.monthly_reviews (id) on delete cascade,
  status public.monthly_review_decision_status not null default 'pending',
  amount numeric(12, 2),
  note text not null default '',
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── RLS — dane wrażliwe (kompensacyjne): bez polityk insert/update/delete,
-- wszystkie zapisy wyłącznie przez API na service-role kliencie ──────────────
alter table public.monthly_reviews enable row level security;
alter table public.monthly_self_assessments enable row level security;
alter table public.monthly_manager_assessments enable row level security;
alter table public.monthly_review_ai_reports enable row level security;
alter table public.monthly_review_decisions enable row level security;

drop policy if exists monthly_reviews_select on public.monthly_reviews;
create policy monthly_reviews_select
  on public.monthly_reviews for select
  using (auth.uid() = employee_id or public.is_manager_or_admin());

drop policy if exists monthly_self_assessments_select on public.monthly_self_assessments;
create policy monthly_self_assessments_select
  on public.monthly_self_assessments for select
  using (auth.uid() = employee_id or public.is_manager_or_admin());

-- Bez klauzuli właściciela: widoczność surowej oceny managera dla pracownika
-- jest dynamicznym ustawieniem (app_settings), egzekwowanym w warstwie API
-- (maskowanie odpowiedzi), tak jak leave-requests?scope=planning.
drop policy if exists monthly_manager_assessments_select on public.monthly_manager_assessments;
create policy monthly_manager_assessments_select
  on public.monthly_manager_assessments for select
  using (public.is_manager_or_admin());

-- Raport AI i decyzja — wyłącznie admin; udostępnienie pracownikowi też
-- egzekwowane w API (po shared_with_employee_at), nie w RLS.
drop policy if exists monthly_review_ai_reports_select on public.monthly_review_ai_reports;
create policy monthly_review_ai_reports_select
  on public.monthly_review_ai_reports for select
  using (public.is_administrator());

drop policy if exists monthly_review_decisions_select on public.monthly_review_decisions;
create policy monthly_review_decisions_select
  on public.monthly_review_decisions for select
  using (public.is_administrator());
