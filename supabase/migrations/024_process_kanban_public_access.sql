-- Hasło (i opcjonalny login) do publicznego linku Kanban

alter table public.process_kanban_boards
  add column if not exists public_access_password_hash text,
  add column if not exists public_access_username text,
  add column if not exists public_author_name text not null default 'Klient';
