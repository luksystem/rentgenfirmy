-- ═══════════════════════════════════════════════════════════════════════════
-- Menu "Ulubione" — pozycje głównego menu oznaczone gwiazdką przez użytkownika
-- pojawiają się na górze, w osobnej grupie. Ustawienie jest prywatne dla
-- każdego użytkownika i synchronizowane między urządzeniami.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.user_nav_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  href text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, href)
);

create index if not exists user_nav_favorites_user_idx on public.user_nav_favorites (user_id, created_at);

comment on table public.user_nav_favorites is
  'Pozycje menu oznaczone gwiazdką ("Ulubione") — prywatne per użytkownik.';

alter table public.user_nav_favorites enable row level security;

drop policy if exists user_nav_favorites_select_own on public.user_nav_favorites;
create policy user_nav_favorites_select_own
  on public.user_nav_favorites for select
  using (auth.uid() = user_id);

drop policy if exists user_nav_favorites_insert_own on public.user_nav_favorites;
create policy user_nav_favorites_insert_own
  on public.user_nav_favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists user_nav_favorites_delete_own on public.user_nav_favorites;
create policy user_nav_favorites_delete_own
  on public.user_nav_favorites for delete
  using (auth.uid() = user_id);
