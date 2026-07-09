-- ═══════════════════════════════════════════════════════════════════════════
-- Plan Zasobów — szablony elementu planu.
-- Rozszerza istniejący generyczny słownik (`resource_dictionary_items`) o nowy
-- klucz 'plan_item_template' — powtarzalne "gotowce" (np. "Produkcja rozdzielni"),
-- które można błyskawicznie wybrać przy tworzeniu elementu planu, zamiast
-- wypełniać wszystkie pola od nowa. Bogatsze pola szablonu (typ pracy, godziny,
-- budżety, ryzyko, notatki) trzymane w istniejącej kolumnie `metadata` (jsonb) —
-- bez nowej tabeli/migracji struktury.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.resource_dictionary_items
  drop constraint if exists resource_dictionary_items_dictionary_key_check;

alter table public.resource_dictionary_items
  add constraint resource_dictionary_items_dictionary_key_check
  check (dictionary_key in (
    'operational_role',
    'competency',
    'competency_level',
    'team',
    'area',
    'work_type',
    'plan_status',
    'risk_level',
    'absence_type',
    'budget_type',
    'plan_item_template'
  ));

-- ── Przykładowy szablon demonstracyjny (edytowalny/usuwalny z ustawień) ─────
insert into public.resource_dictionary_items (dictionary_key, name, description, color, icon, sort_order, metadata)
select
  'plan_item_template',
  'Produkcja rozdzielni',
  'Standardowe prace montażowe przy produkcji rozdzielni elektrycznej.',
  '#2563eb',
  'hammer',
  10,
  jsonb_build_object(
    'workTypeItemId', (select id from public.resource_dictionary_items where dictionary_key = 'work_type' and name = 'Montaż' limit 1),
    'plannedHours', 8,
    'laborBudget', null,
    'materialBudget', null,
    'travelBudget', null,
    'riskItemId', null,
    'notes', ''
  )
where not exists (
  select 1 from public.resource_dictionary_items where dictionary_key = 'plan_item_template' and name = 'Produkcja rozdzielni'
);
