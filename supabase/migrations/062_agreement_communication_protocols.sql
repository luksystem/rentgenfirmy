-- Opcjonalne protokoły komunikacyjne przypisane do ustaleń

alter table public.project_client_agreements
  add column if not exists communication_protocols text[] not null default '{}';
