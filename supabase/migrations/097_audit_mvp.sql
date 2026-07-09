-- ═══════════════════════════════════════════════════════════════════════════
-- Audit MVP — pierwszy pełny przepływ audytu (Universal Audit Engine, wariant SRI)
-- Sesje audytu + odpowiedzi + evidence + wyniki silników (calc/rec/opt/roadmap).
-- Dane metodologii (katalog SRI) czytane są w runtime z generated/eu-sri-v4.5/**,
-- więc ta migracja dotyczy WYŁĄCZNIE stanu audytu (nie katalogu).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Sesja audytu ────────────────────────────────────────────────────────────
create table if not exists public.audit_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'methodology_selected', 'in_progress', 'completed')),
  methodology_version_id text,
  building_type text check (building_type in ('residential', 'non_residential')),
  climate_zone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists audit_sessions_owner_idx
  on public.audit_sessions (owner_id, created_at desc);

-- ── Odpowiedzi (jedna na pytanie/usługę) ────────────────────────────────────
create table if not exists public.audit_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.audit_sessions(id) on delete cascade,
  question_code text not null,               -- kod usługi SRI, np. 'H-1a'
  value_int smallint,                        -- wybrany poziom funkcjonalności
  note text,
  updated_at timestamptz not null default now(),
  unique (session_id, question_code)
);

create index if not exists audit_answers_session_idx
  on public.audit_answers (session_id);

-- ── Evidence (zdjęcia / pliki) ──────────────────────────────────────────────
create table if not exists public.audit_evidence (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.audit_sessions(id) on delete cascade,
  question_code text,
  caption text,
  storage_path text not null,
  content_type text,
  created_at timestamptz not null default now()
);

create index if not exists audit_evidence_session_idx
  on public.audit_evidence (session_id);

-- ── Wyniki silników (jeden wiersz per rodzaj) ───────────────────────────────
create table if not exists public.audit_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.audit_sessions(id) on delete cascade,
  kind text not null check (kind in ('calculation', 'recommendation', 'optimization', 'roadmap')),
  payload jsonb not null,
  engine_version text,
  created_at timestamptz not null default now(),
  unique (session_id, kind)
);

create index if not exists audit_results_session_idx
  on public.audit_results (session_id);

-- ── Storage bucket na evidence ──────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('audit-evidence', 'audit-evidence', false, 15728640)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "audit_evidence_select" on storage.objects;
drop policy if exists "audit_evidence_insert" on storage.objects;
drop policy if exists "audit_evidence_delete" on storage.objects;

create policy "audit_evidence_select"
  on storage.objects for select using (bucket_id = 'audit-evidence');
create policy "audit_evidence_insert"
  on storage.objects for insert with check (bucket_id = 'audit-evidence');
create policy "audit_evidence_delete"
  on storage.objects for delete using (bucket_id = 'audit-evidence');

-- ── RLS: właściciel widzi/zmienia swoje sesje ───────────────────────────────
alter table public.audit_sessions enable row level security;
alter table public.audit_answers enable row level security;
alter table public.audit_evidence enable row level security;
alter table public.audit_results enable row level security;

drop policy if exists "audit_sessions_owner_all" on public.audit_sessions;
create policy "audit_sessions_owner_all" on public.audit_sessions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['audit_answers', 'audit_evidence', 'audit_results'] loop
    execute format('drop policy if exists %I on public.%I;', t || '_owner_all', t);
    execute format(
      'create policy %I on public.%I for all using (exists (select 1 from public.audit_sessions s where s.id = %I.session_id and s.owner_id = auth.uid())) with check (exists (select 1 from public.audit_sessions s where s.id = %I.session_id and s.owner_id = auth.uid()));',
      t || '_owner_all', t, t, t
    );
  end loop;
end $$;
