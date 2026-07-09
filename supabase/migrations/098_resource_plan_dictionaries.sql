-- ═══════════════════════════════════════════════════════════════════════════
-- Plan Zasobów — Etap 1: fundament słownikowy.
-- Jedna generyczna tabela dla wszystkich słowników konfiguracyjnych modułu
-- (role operacyjne, kompetencje, poziomy kompetencji, zespoły, obszary,
-- typy pracy, statusy planu, poziomy ryzyka, typy nieobecności, typy budżetów).
-- Wszystkie wartości są edytowalne z ustawień — poniższe insigicje to tylko
-- przykładowe dane demonstracyjne, nie logika zakodowana na sztywno.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.resource_dictionary_items (
  id uuid primary key default gen_random_uuid(),
  dictionary_key text not null check (dictionary_key in (
    'operational_role',
    'competency',
    'competency_level',
    'team',
    'area',
    'work_type',
    'plan_status',
    'risk_level',
    'absence_type',
    'budget_type'
  )),
  name text not null,
  description text not null default '',
  color text not null default '#64748b',
  icon text not null default 'circle',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dictionary_key, name)
);

create index if not exists resource_dictionary_items_key_idx
  on public.resource_dictionary_items (dictionary_key, sort_order);
create index if not exists resource_dictionary_items_active_idx
  on public.resource_dictionary_items (dictionary_key, is_active);

-- ── Helper RLS: administrator lub manager ("koordynator") ───────────────────
create or replace function public.has_full_app_access()
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

alter table public.resource_dictionary_items enable row level security;

drop policy if exists resource_dictionary_items_select on public.resource_dictionary_items;
create policy resource_dictionary_items_select
  on public.resource_dictionary_items for select
  using (auth.uid() is not null);

drop policy if exists resource_dictionary_items_write on public.resource_dictionary_items;
create policy resource_dictionary_items_write
  on public.resource_dictionary_items for all
  using (public.has_full_app_access())
  with check (public.has_full_app_access());

-- ── Dane demonstracyjne (edytowalne z ustawień) ──────────────────────────────
insert into public.resource_dictionary_items (dictionary_key, name, description, color, icon, sort_order)
values
  ('operational_role', 'Instalator', 'Montaż i okablowanie instalacji.', '#2563eb', 'hard-hat', 10),
  ('operational_role', 'Programista', 'Konfiguracja i programowanie systemów.', '#7c3aed', 'code-2', 20),
  ('operational_role', 'Serwisant', 'Diagnostyka i naprawy serwisowe.', '#0891b2', 'wrench', 30),
  ('operational_role', 'Kierownik projektu', 'Koordynacja realizacji i kontakt z klientem.', '#dc2626', 'user-cog', 40),

  ('competency', 'Loxone', 'Konfiguracja i programowanie systemu Loxone.', '#16a34a', 'cpu', 10),
  ('competency', 'KNX', 'Instalacja i programowanie magistrali KNX.', '#16a34a', 'cpu', 20),
  ('competency', 'CCTV', 'Montaż i konfiguracja systemów CCTV.', '#16a34a', 'camera', 30),
  ('competency', 'SSP/Alarmy', 'Instalacja systemów sygnalizacji pożaru i alarmowych.', '#16a34a', 'siren', 40),
  ('competency', 'HVAC', 'Integracja i sterowanie systemami HVAC.', '#16a34a', 'fan', 50),
  ('competency', 'Sieci LAN', 'Konfiguracja sieci strukturalnych i aktywnych.', '#16a34a', 'network', 60),

  ('competency_level', 'Junior', 'Wymaga nadzoru.', '#94a3b8', 'star', 10),
  ('competency_level', 'Regular', 'Pracuje samodzielnie.', '#f59e0b', 'star', 20),
  ('competency_level', 'Senior', 'Może nadzorować innych.', '#dc2626', 'star', 30),
  ('competency_level', 'Ekspert', 'Referencyjne kompetencje w firmie.', '#7c3aed', 'star', 40),

  ('team', 'Zespół A', 'Zespół instalacyjny A.', '#2563eb', 'users', 10),
  ('team', 'Zespół B', 'Zespół instalacyjny B.', '#0891b2', 'users', 20),
  ('team', 'Zespół serwisowy', 'Zespół obsługi zgłoszeń serwisowych.', '#16a34a', 'wrench', 30),

  ('area', 'Smart Home', 'Instalacje automatyki domowej.', '#2563eb', 'home', 10),
  ('area', 'BMS', 'Systemy zarządzania budynkiem.', '#7c3aed', 'building-2', 20),
  ('area', 'CCTV', 'Systemy monitoringu wizyjnego.', '#0891b2', 'camera', 30),
  ('area', 'SSP / Alarmy', 'Systemy sygnalizacji pożaru i alarmowe.', '#dc2626', 'siren', 40),
  ('area', 'HVAC', 'Klimatyzacja i wentylacja.', '#16a34a', 'fan', 50),
  ('area', 'LAN', 'Sieci strukturalne.', '#f59e0b', 'network', 60),

  ('work_type', 'Montaż', 'Prace instalacyjne na obiekcie.', '#2563eb', 'hammer', 10),
  ('work_type', 'Programowanie', 'Konfiguracja i programowanie systemów.', '#7c3aed', 'code-2', 20),
  ('work_type', 'Serwis', 'Prace serwisowe i naprawcze.', '#0891b2', 'wrench', 30),
  ('work_type', 'Projektowanie', 'Prace projektowe i koncepcyjne.', '#f59e0b', 'pencil-ruler', 40),
  ('work_type', 'Odbiór', 'Odbiory i protokoły.', '#16a34a', 'clipboard-check', 50),

  ('plan_status', 'Planowane', 'Zaplanowane, jeszcze nie rozpoczęte.', '#94a3b8', 'circle-dashed', 10),
  ('plan_status', 'W realizacji', 'Prace w trakcie.', '#2563eb', 'circle-play', 20),
  ('plan_status', 'Zagrożone', 'Ryzyko niedotrzymania terminu.', '#dc2626', 'triangle-alert', 30),
  ('plan_status', 'Zakończone', 'Prace zakończone.', '#16a34a', 'circle-check', 40),
  ('plan_status', 'Wstrzymane', 'Prace tymczasowo zatrzymane.', '#f59e0b', 'circle-pause', 50),

  ('risk_level', 'Niskie', 'Standardowe ryzyko realizacji.', '#16a34a', 'shield-check', 10),
  ('risk_level', 'Średnie', 'Wymaga uwagi koordynatora.', '#f59e0b', 'shield-alert', 20),
  ('risk_level', 'Wysokie', 'Wysokie ryzyko — wymaga świadomej akceptacji.', '#dc2626', 'shield-x', 30),

  ('absence_type', 'Urlop', 'Urlop wypoczynkowy.', '#2563eb', 'palmtree', 10),
  ('absence_type', 'Choroba', 'Niedyspozycja zdrowotna.', '#dc2626', 'thermometer', 20),
  ('absence_type', 'Delegacja', 'Wyjazd służbowy poza standardowy plan.', '#7c3aed', 'plane', 30),
  ('absence_type', 'Szkolenie', 'Udział w szkoleniu/certyfikacji.', '#16a34a', 'graduation-cap', 40),

  ('budget_type', 'Robocizna', 'Koszt pracy zespołu.', '#2563eb', 'hammer', 10),
  ('budget_type', 'Materiały', 'Koszt materiałów i urządzeń.', '#7c3aed', 'package', 20),
  ('budget_type', 'Dojazd', 'Koszty transportu i delegacji.', '#0891b2', 'car', 30)
on conflict (dictionary_key, name) do nothing;
