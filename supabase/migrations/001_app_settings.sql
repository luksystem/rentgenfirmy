-- Uruchom w Supabase SQL Editor, jeśli baza już istnieje bez tabeli app_settings

create table if not exists public.app_settings (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_all" on public.app_settings;
drop policy if exists "app_settings_insert_all" on public.app_settings;
drop policy if exists "app_settings_update_all" on public.app_settings;
drop policy if exists "app_settings_delete_all" on public.app_settings;

create policy "app_settings_select_all" on public.app_settings for select using (true);
create policy "app_settings_insert_all" on public.app_settings for insert with check (true);
create policy "app_settings_update_all" on public.app_settings for update using (true);
create policy "app_settings_delete_all" on public.app_settings for delete using (true);
