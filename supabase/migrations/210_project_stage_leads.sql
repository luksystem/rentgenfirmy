-- Faza 1 — Lider Etapu jako dana własna projektu, poza template_snapshot (docs/08 D1).
-- Osobna tabela zamiast kolumny w "project_process_stage" — taka tabela nie istnieje,
-- struktura etapów per projekt jest zamrożonym JSON-em w project_processes.template_snapshot.
-- stage_id jest MIĘKKIM odniesieniem (tekst, bez FK) do id etapu w template_snapshot —
-- ten sam, już ustalony w tym repo wzorzec co project_processes.active_stage_id,
-- project_client_agreements.acceptance_deadline_stage_id i resource_plan_items.process_stage_id.

create table if not exists public.project_stage_leads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  stage_id text not null,
  user_id uuid not null references public.profiles (id),
  since date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, stage_id)
);

comment on table public.project_stage_leads is
  'Lider Etapu (poziom projektu, nie poziom pojedynczego przydziału zasobu) — dane własne '
  'projektu poza template_snapshot (D1). stage_id to miękkie odniesienie do id etapu w snapshotcie, '
  'bez twardego FK — patrz raport osieroconych odniesień w 211.';
comment on column public.project_stage_leads.stage_id is
  'Id etapu w template_snapshot projektu (== process_stages.id w chwili sklonowania szablonu). Nie FK.';

create table if not exists public.project_stage_lead_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  stage_id text not null,
  user_id uuid not null references public.profiles (id),
  from_date date not null,
  to_date date,
  handover_from uuid references public.profiles (id),
  handover_note text,
  created_at timestamptz not null default now()
);

comment on table public.project_stage_lead_history is
  'Historia zmian Lidera Etapu — wyłącznie do protokołu przekazania (/docs/04 §5). '
  'handover_note obowiązkowe przy zmianie w trakcie trwania etapu (stan listy, pozycje otwarte, powody).';

create index if not exists project_stage_leads_project_idx on public.project_stage_leads (project_id);
create index if not exists project_stage_lead_history_project_stage_idx
  on public.project_stage_lead_history (project_id, stage_id);

alter table public.project_stage_leads enable row level security;
alter table public.project_stage_lead_history enable row level security;

drop policy if exists "project_stage_leads_all" on public.project_stage_leads;
create policy "project_stage_leads_all" on public.project_stage_leads
  for all using (true) with check (true);

drop policy if exists "project_stage_lead_history_all" on public.project_stage_lead_history;
create policy "project_stage_lead_history_all" on public.project_stage_lead_history
  for all using (true) with check (true);

-- Brak backfillu — dziś nie istnieje żadne pole "lider etapu" w bazie, więc nie ma
-- z czego migrować. Tabela startuje pusta.
