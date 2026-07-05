-- Blokada kolejnego etapu procesu: deadline akceptacji w Ustaleniach + flaga na elementach
-- procesu (checklista / protokół / kanban) ustawiana z poziomu projektu. Kaskadowa blokada:
-- wybrany etap (Ustalenia) lub kolejny etap po elemencie (proces) i wszystkie etapy po nim.

alter table public.project_process_items
  add column if not exists blocks_next_stage boolean not null default false;

alter table public.project_processes
  add column if not exists active_stage_id text;

alter table public.project_client_agreements
  add column if not exists acceptance_deadline_stage_id text,
  add column if not exists blocks_next_stage boolean not null default false;

comment on column public.project_process_items.blocks_next_stage is
  'Jeśli true i element nie jest ukończony, blokuje kolejny etap procesu (i wszystkie po nim).';
comment on column public.project_processes.active_stage_id is
  'Etap procesu ręcznie oznaczony jako aktualnie aktywny (id etapu w template_snapshot).';
comment on column public.project_client_agreements.acceptance_deadline_stage_id is
  'Id etapu procesu (w template_snapshot projektu), przed którym ustalenie musi być zaakceptowane.';
comment on column public.project_client_agreements.blocks_next_stage is
  'Jeśli true i ustalenie nie jest w pełni zaakceptowane, blokuje wybrany etap (i wszystkie po nim).';
