-- Zaakceptowana zmiana projektowa dopisuje się automatycznie nie tylko jako należność
-- (kind='charge'), ale też jako rata harmonogramu spłat (kind='schedule') — ten sam mechanizm
-- upsertAutoCharge/removeStaleLinkedCharges w lib/supabase/project-settlement-repository.ts
-- teraz obsługuje oba kind. Unikalny indeks analogiczny do project_settlement_entries_auto_source_uidx,
-- ale scoped do kind='schedule' i source='change_request', żeby nie powstały duplikaty przy
-- równoległych wywołaniach sync.

create unique index if not exists project_settlement_entries_auto_schedule_source_uidx
  on public.project_settlement_entries (
    project_id,
    source,
    coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where kind = 'schedule'
    and is_auto = true
    and source = 'change_request';
