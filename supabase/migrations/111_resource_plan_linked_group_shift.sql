-- ═══════════════════════════════════════════════════════════════════════════
-- Plan Zasobów — "zależność pociętych części": opcjonalny łańcuch przesunięcia dla
-- elementów podzielonego przydziału (linked_group_id, patrz migracja 110). Gdy włączone,
-- przesunięcie/rozciągnięcie prawej krawędzi jednej części w Gantcie przesuwa też wszystkie
-- kolejne (późniejsze) części tej samej grupy o tę samą wartość, zachowując odstępy między nimi.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.resource_plan_items
  add column if not exists shift_with_linked_group boolean not null default false;

comment on column public.resource_plan_items.shift_with_linked_group is
  'Gdy true (ustawione na wszystkich częściach grupy naraz — patrz setLinkedGroupShiftEnabled), '
  'przesunięcie/rozciągnięcie w Gantcie przesuwa też kolejne części tego samego linked_group_id, '
  'zachowując odstępy czasowe między nimi.';
