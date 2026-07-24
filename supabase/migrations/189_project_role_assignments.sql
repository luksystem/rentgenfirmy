-- Role projektowe (lider techniczny / lider operacyjny / programista) — do targetowania
-- powiadomień (np. akceptacja zmiany przez klienta) tylko do wyznaczonych osób, nie do
-- wszystkich z dostępem do projektu. Rozszerzamy istniejącą profile_project_access zamiast
-- tworzyć nową tabelę — to już jest miejsce "przypisanie usera do projektu".

alter table public.profile_project_access
  add column if not exists is_technical_lead boolean not null default false,
  add column if not exists is_operational_lead boolean not null default false,
  add column if not exists is_developer boolean not null default false;

comment on column public.profile_project_access.is_technical_lead is
  'Lider techniczny projektu — dostaje powiadomienia o zdarzeniach wymagających reakcji technicznej.';
comment on column public.profile_project_access.is_operational_lead is
  'Lider operacyjny projektu — dostaje powiadomienia o zdarzeniach operacyjnych/handlowych.';
comment on column public.profile_project_access.is_developer is
  'Programista przypisany do projektu — dostaje powiadomienia dotyczące zmian technicznych.';

create index if not exists profile_project_access_roles_idx
  on public.profile_project_access (project_id)
  where is_technical_lead or is_operational_lead or is_developer;
