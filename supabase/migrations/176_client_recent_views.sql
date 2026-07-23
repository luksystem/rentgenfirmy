-- ═══════════════════════════════════════════════════════════════════════════
-- Ostatnio otwierani / ulubieni klienci — per użytkownik, synchronizowane
-- między urządzeniami. Jeden wiersz na parę (user, client): licznik i data
-- ostatniego otwarcia dashboardu klienta + opcjonalny ręczny pin (nadpisuje
-- automatyczne wyliczanie ulubionych z częstotliwości odwiedzin).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.client_recent_views (
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  pinned_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, client_id)
);

create index if not exists client_recent_views_user_last_viewed_idx
  on public.client_recent_views (user_id, last_viewed_at desc);

comment on table public.client_recent_views is
  'Historia otwierania dashboardu klienta per użytkownik — napędza „Ostatnio otwierani” i automatyczne ulubione; pinned_at to ręczne wymuszenie ulubionego.';

alter table public.client_recent_views enable row level security;

drop policy if exists client_recent_views_select_own on public.client_recent_views;
create policy client_recent_views_select_own
  on public.client_recent_views for select
  using (auth.uid() = user_id);

drop policy if exists client_recent_views_insert_own on public.client_recent_views;
create policy client_recent_views_insert_own
  on public.client_recent_views for insert
  with check (auth.uid() = user_id);

drop policy if exists client_recent_views_update_own on public.client_recent_views;
create policy client_recent_views_update_own
  on public.client_recent_views for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists client_recent_views_delete_own on public.client_recent_views;
create policy client_recent_views_delete_own
  on public.client_recent_views for delete
  using (auth.uid() = user_id);

-- ── Atomowy zapis odwiedzin — unika race'a przy read-then-write z klienta
-- (np. dwie karty przeglądarki otwierające tego samego klienta jednocześnie).
create or replace function public.record_client_view(p_client_id uuid)
returns public.client_recent_views
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.client_recent_views;
begin
  if auth.uid() is null then
    raise exception 'Brak zalogowanego użytkownika';
  end if;

  insert into public.client_recent_views (user_id, client_id, view_count, last_viewed_at)
  values (auth.uid(), p_client_id, 1, now())
  on conflict (user_id, client_id)
  do update set
    view_count = public.client_recent_views.view_count + 1,
    last_viewed_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function public.record_client_view(uuid) from public;
grant execute on function public.record_client_view(uuid) to authenticated;
