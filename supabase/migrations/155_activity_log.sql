-- Centralny dziennik aktywności aplikacji (admin feed).

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  actor_name text not null default '',
  action text not null,
  entity_type text not null,
  entity_id text,
  entity_label text not null default '',
  summary text not null,
  href text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists activity_log_created_at_idx
  on public.activity_log (created_at desc);

create index if not exists activity_log_actor_user_id_idx
  on public.activity_log (actor_user_id)
  where actor_user_id is not null;

create index if not exists activity_log_entity_type_idx
  on public.activity_log (entity_type);

alter table public.activity_log enable row level security;

drop policy if exists activity_log_select_admin on public.activity_log;
create policy activity_log_select_admin
  on public.activity_log for select
  using (public.is_administrator());

drop policy if exists activity_log_insert_authenticated on public.activity_log;
create policy activity_log_insert_authenticated
  on public.activity_log for insert
  with check (auth.uid() is not null);
