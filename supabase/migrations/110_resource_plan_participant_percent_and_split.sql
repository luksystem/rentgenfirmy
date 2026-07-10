-- ═══════════════════════════════════════════════════════════════════════════
-- Plan Zasobów — rozszerzenie: % zaangażowania osoby zaangażowanej (z własnym,
-- opcjonalnym zakresem dat) + podział jednego przydziału na kilka elementów
-- powiązanych (linked_group_id), tak żeby nadal był traktowany jako "jeden
-- przydział" w UI (Gantt/lista/panel edycji).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.resource_plan_item_participants
  add column if not exists involvement_percent numeric not null default 100
    check (involvement_percent > 0 and involvement_percent <= 100),
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz;

comment on column public.resource_plan_item_participants.involvement_percent is
  'Procent godzin elementu przypisany tej osobie (np. 40h elementu × 50% = 20h). '
  'Przy skróceniu/wydłużeniu własnego zakresu dat (start_at/end_at) przeliczany '
  'proporcjonalnie do zmiany długości okresu — patrz lib/resource-plan/participant-contribution.ts.';
comment on column public.resource_plan_item_participants.start_at is
  'Własny zakres dat uczestnika (podzbiór start_at/end_at elementu) — NULL = cały zakres elementu.';
comment on column public.resource_plan_item_participants.end_at is
  'Patrz start_at.';

alter table public.resource_plan_items
  add column if not exists linked_group_id uuid;

comment on column public.resource_plan_items.linked_group_id is
  'Elementy z tym samym linked_group_id to części jednego przydziału podzielonego '
  'w czasie (np. przerwa w środku) — patrz splitResourcePlanItem w resource-plan-repository.ts.';

create index if not exists resource_plan_items_linked_group_idx
  on public.resource_plan_items (linked_group_id)
  where linked_group_id is not null;
