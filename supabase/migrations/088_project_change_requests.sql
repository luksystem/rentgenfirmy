-- Karta zmian Projektu: zmiany zakresu / kosztu projektu wymagające akceptacji klienta.
-- Działa analogicznie do Ustaleń (status, deadline etapu, blokada kolejnego etapu), ale
-- jako osobny moduł, żeby koszty zmian dało się jednoznacznie zsumować do kosztu całkowitego
-- projektu (baza z ofert + suma zaakceptowanych zmian).

create table if not exists public.project_change_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  body text not null default '',
  status text not null default 'draft' check (status in ('draft', 'pending_client', 'accepted', 'rejected', 'cancelled')),
  proposed_cost_net numeric(12, 2),
  proposed_cost_gross numeric(12, 2),
  proposed_cost_vat_rate numeric(5, 2),
  cost_note text,
  created_by_name text not null,
  created_by_side text not null default 'team' check (created_by_side in ('team', 'client')),
  submitted_at timestamptz,
  client_responded_at timestamptz,
  client_response_name text,
  client_response_note text,
  position integer not null default 0,
  acceptance_deadline_stage_id text,
  blocks_next_stage boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_change_requests_project_id_idx
  on public.project_change_requests (project_id);

create index if not exists project_change_requests_status_idx
  on public.project_change_requests (project_id, status);

alter table public.project_change_requests enable row level security;

drop policy if exists "project_change_requests_select_all" on public.project_change_requests;
drop policy if exists "project_change_requests_insert_all" on public.project_change_requests;
drop policy if exists "project_change_requests_update_all" on public.project_change_requests;
drop policy if exists "project_change_requests_delete_all" on public.project_change_requests;

create policy "project_change_requests_select_all" on public.project_change_requests for select using (true);
create policy "project_change_requests_insert_all" on public.project_change_requests for insert with check (true);
create policy "project_change_requests_update_all" on public.project_change_requests for update using (true);
create policy "project_change_requests_delete_all" on public.project_change_requests for delete using (true);

alter table public.project_change_requests replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.project_change_requests;
  end if;
exception
  when duplicate_object then null;
end $$;

comment on table public.project_change_requests is
  'Karta zmian Projektu: zmiany zakresu/kosztu wymagające akceptacji klienta. Akceptowane koszty sumują się do kosztu całkowitego projektu.';
comment on column public.project_change_requests.acceptance_deadline_stage_id is
  'Id etapu procesu (w template_snapshot projektu), przed którym zmiana musi być zaakceptowana.';
comment on column public.project_change_requests.blocks_next_stage is
  'Jeśli true i zmiana nie jest zaakceptowana, blokuje wybrany etap (i wszystkie po nim).';
