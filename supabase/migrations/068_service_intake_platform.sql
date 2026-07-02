-- Rozszerzenie zgłoszeń serwisowych: wątek, załączniki, zamknięcie

alter table public.service_intake_requests
  add column if not exists closed_at timestamptz;

create table if not exists public.service_intake_attachments (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.service_intake_requests (id) on delete cascade,
  kind text not null check (kind in ('image', 'video', 'link')),
  url text not null,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists service_intake_attachments_intake_idx
  on public.service_intake_attachments (intake_id, created_at desc);

create table if not exists public.service_intake_comments (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.service_intake_requests (id) on delete cascade,
  author_name text not null,
  author_side text not null check (author_side in ('client', 'team')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists service_intake_comments_intake_idx
  on public.service_intake_comments (intake_id, created_at asc);

alter table public.service_intake_attachments enable row level security;
alter table public.service_intake_comments enable row level security;

drop policy if exists "service_intake_attachments_select_authenticated"
  on public.service_intake_attachments;
drop policy if exists "service_intake_comments_select_authenticated"
  on public.service_intake_comments;
drop policy if exists "service_intake_comments_insert_authenticated"
  on public.service_intake_comments;

create policy "service_intake_attachments_select_authenticated"
  on public.service_intake_attachments for select
  to authenticated
  using (true);

create policy "service_intake_comments_select_authenticated"
  on public.service_intake_comments for select
  to authenticated
  using (true);

create policy "service_intake_comments_insert_authenticated"
  on public.service_intake_comments for insert
  to authenticated
  with check (true);
