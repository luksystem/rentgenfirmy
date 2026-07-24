-- Moduł Czatu — powiązanie kontaktu klienta (profil roli 'klient') z wierszem clients.
-- Brakujący dziś link klient↔profil (dashboard klienta działa przez osobny token, nie
-- auth.uid()) — potrzebny, żeby RLS pokoju "Klient" mogło opierać się na auth.uid().
-- Zarządzane wyłącznie przez admina — brak polityk client-side (patrz 193_).

create table if not exists public.chat_client_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (client_id, profile_id)
);

create index if not exists chat_client_members_client_id_idx on public.chat_client_members (client_id);
create index if not exists chat_client_members_profile_id_idx on public.chat_client_members (profile_id);

alter table public.chat_client_members enable row level security;
