-- Powiadomienia użytkownika (oznaczenia @, Kanban itd.)

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('kanban_mention', 'kanban_new_activity')),
  title text not null,
  body text not null default '',
  link_url text,
  source_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_profile_unread_idx
  on public.user_notifications (profile_id, read_at, created_at desc);

alter table public.user_notifications enable row level security;

drop policy if exists "user_notifications_select_all" on public.user_notifications;
drop policy if exists "user_notifications_insert_all" on public.user_notifications;
drop policy if exists "user_notifications_update_all" on public.user_notifications;

create policy "user_notifications_select_all" on public.user_notifications for select using (true);
create policy "user_notifications_insert_all" on public.user_notifications for insert with check (true);
create policy "user_notifications_update_all" on public.user_notifications for update using (true);
