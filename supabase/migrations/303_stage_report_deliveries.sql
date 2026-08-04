-- Faza 5 (Generator raportu etapowego) — historia wysylek maila raportu etapowego.
--
-- project_stage_reports.sent_at/sent_by trzyma tylko OSTATNIA wysylke (nadpisywane przy kazdym
-- "Wyslij ponownie" — patrz 226_project_stage_reports.sql + lib/supabase/stage-report-email-server.ts).
-- Ten stol jest niezalezna, append-only historia: kazde wywolanie sendStageReportEmailServer
-- dopisuje tu jeden wiersz, wiec widac WSZYSTKIE historyczne wysylki tego raportu, z komentarzem
-- (note), ktory towarzyszyl kazdej z nich.
create table public.project_stage_report_deliveries (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.project_stage_reports(id) on delete cascade,
  sent_at timestamptz not null default now(),
  sent_by uuid references public.profiles(id),
  sent_by_name text not null default '',
  recipient_email text not null default '',
  subject text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create index project_stage_report_deliveries_report_idx
  on public.project_stage_report_deliveries (report_id, sent_at desc);

alter table public.project_stage_report_deliveries enable row level security;

create policy project_stage_report_deliveries_select on public.project_stage_report_deliveries
  for select using (auth.uid() is not null);

create policy project_stage_report_deliveries_write on public.project_stage_report_deliveries
  for all using (has_full_app_access()) with check (has_full_app_access());

comment on table public.project_stage_report_deliveries is
  'Append-only historia wysylek maila raportu etapowego (jeden wiersz na kazde faktyczne wyslanie, '
  'w tym "Wyslij ponownie") — project_stage_reports.sent_at/sent_by trzyma tylko ostatnia wysylke.';
