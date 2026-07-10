-- ═══════════════════════════════════════════════════════════════════════════
-- Audit UX — metadane raportu, statusy weryfikacji odpowiedzi oraz bezpieczne
-- publiczne udostępnianie raportu (token + hasło scrypt + logi dostępu).
-- Nie zmienia logiki/punktacji SRI — wyłącznie warstwa prezentacji i sharingu.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Metadane raportu na sesji ───────────────────────────────────────────────
alter table public.audit_sessions
  add column if not exists building_address text,
  add column if not exists auditor_name text,
  add column if not exists audited_at date;

-- ── Metadana weryfikacji odpowiedzi (poza punktacją SRI) ─────────────────────
alter table public.audit_answers
  add column if not exists verification_status text
    check (verification_status in ('confirmed', 'uncertain', 'to_verify', 'no_data'));

-- ── Publiczne udostępnianie raportu ─────────────────────────────────────────
create table if not exists public.audit_report_shares (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.audit_sessions(id) on delete cascade,
  token text not null unique,
  password_hash text not null,                 -- scrypt:salt:hash (nigdy jawne hasło)
  is_active boolean not null default true,
  expires_at timestamptz,
  max_views integer,
  view_count integer not null default 0,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  visible_sections jsonb not null default '{
    "overall_score": true, "domains": true, "criteria": true,
    "recommendations": true, "roadmap": true,
    "photos": false, "technical": false, "client_data": false
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id)                          -- jeden aktywny link konfiguracyjny per sesja
);

create index if not exists audit_report_shares_token_idx on public.audit_report_shares (token);
create index if not exists audit_report_shares_session_idx on public.audit_report_shares (session_id);

create table if not exists public.audit_report_share_access_log (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.audit_report_shares(id) on delete cascade,
  event text not null check (event in ('view', 'password_ok', 'password_fail')),
  ip_hash text,                                -- SHA-256(IP + sól serwera), brak surowego IP
  user_agent text,
  password_ok boolean,
  accessed_at timestamptz not null default now()
);

create index if not exists audit_report_share_access_log_share_idx
  on public.audit_report_share_access_log (share_id, accessed_at desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.audit_report_shares enable row level security;
alter table public.audit_report_share_access_log enable row level security;

drop policy if exists "audit_report_shares_owner_all" on public.audit_report_shares;
create policy "audit_report_shares_owner_all" on public.audit_report_shares
  for all
  using (exists (select 1 from public.audit_sessions s where s.id = session_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.audit_sessions s where s.id = session_id and s.owner_id = auth.uid()));

drop policy if exists "audit_report_share_log_owner_all" on public.audit_report_share_access_log;
create policy "audit_report_share_log_owner_all" on public.audit_report_share_access_log
  for all
  using (
    exists (
      select 1 from public.audit_report_shares sh
      join public.audit_sessions s on s.id = sh.session_id
      where sh.id = share_id and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.audit_report_shares sh
      join public.audit_sessions s on s.id = sh.session_id
      where sh.id = share_id and s.owner_id = auth.uid()
    )
  );

-- Uwaga: publiczny odczyt raportu i zapis logów wykonuje service-role na serwerze
-- (po weryfikacji hasła/sesji), z pominięciem RLS — brak publicznego dostępu do audit_*.
