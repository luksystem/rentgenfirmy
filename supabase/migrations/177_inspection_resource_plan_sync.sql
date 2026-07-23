-- ═══════════════════════════════════════════════════════════════════════════
-- Plan Zasobów × Przeglądy — przeglądy (inspections) trafiają na plan zasobów
-- od razu po zaplanowaniu (data wstępna), a po ustaleniu terminu wpis
-- aktualizuje się na datę ustaloną. Wzorem service_intake_request_id
-- (migracja 101), ale bez "on delete set null" — usunięcie przeglądu ma
-- usuwać jego wpis z planu zasobów.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.resource_plan_items
  add column if not exists inspection_id uuid references public.inspections (id) on delete cascade;

-- null = element nie pochodzi z przeglądu; false = data wstępna; true = data ustalona.
alter table public.resource_plan_items
  add column if not exists inspection_date_confirmed boolean;

create unique index if not exists resource_plan_items_inspection_idx
  on public.resource_plan_items (inspection_id)
  where inspection_id is not null;

insert into public.resource_dictionary_items (dictionary_key, name, description, color, icon, sort_order)
values ('work_type', 'Przegląd', 'Cykliczne przeglądy systemów.', '#0d9488', 'shield-check', 60)
on conflict (dictionary_key, name) do nothing;
