-- ═══════════════════════════════════════════════════════════════════════════
-- Moduł "Moja praca" — Dostępność / Urlopy: proces akceptacji wniosków urlopowych.
-- Pracownik składa wniosek (typ, zakres dat, notatka) → trafia do przełożonego
-- i administratora → akceptacja wymaga podpisu elektronicznego i generuje kartę
-- urlopową PDF → integracja z Kalendarzem Google (wpis całodniowy).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Słownik typów dostępności/urlopu — osobny klucz od "absence_type" (Plan
-- Zasobów), bo tu wpisy przechodzą przez formalny workflow akceptacji ─────────
alter table public.resource_dictionary_items drop constraint if exists resource_dictionary_items_dictionary_key_check;
alter table public.resource_dictionary_items add constraint resource_dictionary_items_dictionary_key_check
  check (dictionary_key in (
    'operational_role',
    'competency',
    'competency_level',
    'team',
    'area',
    'work_type',
    'plan_status',
    'risk_level',
    'absence_type',
    'budget_type',
    'plan_item_template',
    'leave_type'
  ));

insert into public.resource_dictionary_items (dictionary_key, name, description, color, icon, sort_order)
values
  ('leave_type', 'Urlop wypoczynkowy', 'Standardowy urlop wypoczynkowy.', '#2563eb', 'palmtree', 10),
  ('leave_type', 'Zwolnienie lekarskie', 'Niedyspozycja zdrowotna (L4).', '#dc2626', 'thermometer', 20),
  ('leave_type', 'Urlop na żądanie', 'Urlop na żądanie zgłoszony z krótkim wyprzedzeniem.', '#f59e0b', 'zap', 30),
  ('leave_type', 'Urlop bezpłatny', 'Urlop bezpłatny.', '#64748b', 'ban', 40),
  ('leave_type', 'Opieka nad dzieckiem', 'Opieka nad dzieckiem / zasiłek opiekuńczy.', '#0891b2', 'baby', 50),
  ('leave_type', 'Delegacja / wyjazd służbowy', 'Wyjazd służbowy poza standardowy plan pracy.', '#7c3aed', 'plane', 60),
  ('leave_type', 'Inne', 'Inny typ nieobecności nieujęty powyżej.', '#94a3b8', 'circle-dashed', 70)
on conflict (dictionary_key, name) do nothing;

-- ── Przełożony użytkownika (wybór z istniejących profili) ───────────────────
alter table public.profiles
  add column if not exists supervisor_id uuid references public.profiles (id) on delete set null;

create index if not exists profiles_supervisor_idx on public.profiles (supervisor_id);

comment on column public.profiles.supervisor_id is
  'Przełożony użytkownika — odbiorca wniosków urlopowych do akceptacji. Wymagany dla wszystkich ról poza administratorem (walidacja w aplikacji).';

-- ── Wnioski o dostępność / urlop ──────────────────────────────────────────────
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  leave_type_item_id uuid references public.resource_dictionary_items (id) on delete set null,
  start_date date not null,
  end_date date not null,
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  supervisor_id uuid references public.profiles (id) on delete set null,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  decision_note text not null default '',
  signature jsonb,
  generated_pdf_path text,
  generated_pdf_name text,
  google_calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists leave_requests_profile_idx on public.leave_requests (profile_id, start_date desc);
create index if not exists leave_requests_supervisor_idx on public.leave_requests (supervisor_id, status);
create index if not exists leave_requests_status_idx on public.leave_requests (status);
create index if not exists leave_requests_range_idx on public.leave_requests (start_date, end_date);

comment on column public.leave_requests.signature is
  'Podpis elektroniczny osoby akceptującej: { imageDataUrl, signerName, signedAt }.';
comment on column public.leave_requests.supervisor_id is
  'Migawka przełożonego z chwili złożenia wniosku (profiles.supervisor_id mógł się później zmienić).';

alter table public.leave_requests enable row level security;

drop policy if exists leave_requests_select on public.leave_requests;
create policy leave_requests_select
  on public.leave_requests for select
  using (auth.uid() is not null);

-- Zapis wyłącznie przez API (service role) — tam pilnujemy uprawnień (właściciel,
-- przełożony, administrator) oraz reguł przejścia statusu (raz zdecydowany wniosek
-- nie wraca do edycji przez inną osobę niż administrator).

-- ── Karty urlopowe (wzór PDF + wygenerowane, podpisane karty) ────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('leave-cards', 'leave-cards', false, 15728640)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "leave_cards_select" on storage.objects;
drop policy if exists "leave_cards_insert" on storage.objects;
drop policy if exists "leave_cards_update" on storage.objects;
drop policy if exists "leave_cards_delete" on storage.objects;

create policy "leave_cards_select"
  on storage.objects for select
  using (bucket_id = 'leave-cards');

create policy "leave_cards_insert"
  on storage.objects for insert
  with check (bucket_id = 'leave-cards');

create policy "leave_cards_update"
  on storage.objects for update
  using (bucket_id = 'leave-cards');

create policy "leave_cards_delete"
  on storage.objects for delete
  using (bucket_id = 'leave-cards');

-- ── Powiadomienia — rozszerzenie istniejącego katalogu kind ──────────────────
alter table public.user_notifications drop constraint if exists user_notifications_kind_check;
alter table public.user_notifications add constraint user_notifications_kind_check
  check (kind in (
    'kanban_mention',
    'kanban_new_activity',
    'warranty_expiring',
    'agreement_client_created',
    'client_stage_rating',
    'service_intake_preliminary_offer',
    'inspection_billing_due',
    'goal_review_due',
    'goal_period_ending',
    'goal_at_risk',
    'goal_recurring_created',
    'leave_request_created',
    'leave_request_decided'
  ));
