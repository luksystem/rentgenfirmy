-- Harmonogram spłat ↔ etap procesu + źródło należności z ustaleń (agreements).

alter table public.project_settlement_entries
  add column if not exists process_stage_id text;

comment on column public.project_settlement_entries.process_stage_id is
  'Etap procesu powiązany z pozycją harmonogramu spłat (data przewidywanej spłaty z kamienia milowego).';

alter table public.project_settlement_entries
  drop constraint if exists project_settlement_entries_source_check;

alter table public.project_settlement_entries
  add constraint project_settlement_entries_source_check
  check (source in ('contract', 'offer', 'change_request', 'hourly', 'manual', 'none', 'agreement'));

-- Unikalność auto-charge także dla agreement
drop index if exists project_settlement_entries_auto_source_uidx;

create unique index if not exists project_settlement_entries_auto_source_uidx
  on public.project_settlement_entries (
    project_id,
    source,
    coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where kind = 'charge'
    and is_auto = true
    and source in ('contract', 'offer', 'change_request', 'hourly', 'agreement');
