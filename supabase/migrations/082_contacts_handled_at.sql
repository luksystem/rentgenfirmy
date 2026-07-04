-- Śledzenie nieobsłużonych kontaktów (np. z formularza zgłoszenia gościa)

alter table public.contacts
  add column if not exists handled_at timestamptz;

create index if not exists contacts_unhandled_idx
  on public.contacts (handled_at)
  where handled_at is null and converted_client_id is null;

-- Istniejące rekordy traktujemy jako już obsłużone
update public.contacts
set handled_at = coalesce(updated_at, created_at)
where handled_at is null;
