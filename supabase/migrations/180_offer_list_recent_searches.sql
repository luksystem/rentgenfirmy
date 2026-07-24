-- Zapamiętane wyszukiwania klienta na liście "Szybkie oferty" (/oferty) — per użytkownik.

create table if not exists public.offer_list_recent_searches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  query text not null,
  created_at timestamptz not null default now()
);

create index if not exists offer_list_recent_searches_profile_idx
  on public.offer_list_recent_searches (profile_id, created_at desc);

comment on table public.offer_list_recent_searches is
  'Historia wyszukiwań po kliencie na liście ofert — napędza podpowiedzi "Ostatnie wyszukiwania".';

alter table public.offer_list_recent_searches enable row level security;

drop policy if exists offer_list_recent_searches_select_own on public.offer_list_recent_searches;
create policy offer_list_recent_searches_select_own
  on public.offer_list_recent_searches for select
  using (auth.uid() = profile_id);

drop policy if exists offer_list_recent_searches_insert_own on public.offer_list_recent_searches;
create policy offer_list_recent_searches_insert_own
  on public.offer_list_recent_searches for insert
  with check (auth.uid() = profile_id);

drop policy if exists offer_list_recent_searches_delete_own on public.offer_list_recent_searches;
create policy offer_list_recent_searches_delete_own
  on public.offer_list_recent_searches for delete
  using (auth.uid() = profile_id);
