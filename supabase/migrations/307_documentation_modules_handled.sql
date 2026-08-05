-- "Ogarnięte" na obwodach rozdzielni i pozycjach modułów dokumentacyjnych.
--
-- Rozdzielnie (switchboard_circuits) i pięć modułów siostrzanych (documentation_module_items)
-- mają dziś tylko status postępu fizycznego montażu (nie_ruszone…problem) — brak sposobu
-- zaznaczenia "zgłoszone, obsłużone, nie musi dalej straszyć" bez zmiany tego statusu.
-- Celowo INNA nazwa niż completed_at na poziomie modułu/rozdzielni (documentation_modules.completed_at,
-- switchboards.completed_at) — to pole zamyka całą tablicę, nie pojedynczy wiersz.

alter table public.switchboard_circuits
  add column if not exists handled_at timestamptz,
  add column if not exists handled_by_id uuid,
  add column if not exists handled_by_name text,
  add column if not exists handled_note text;

alter table public.documentation_module_items
  add column if not exists handled_at timestamptz,
  add column if not exists handled_by_id uuid,
  add column if not exists handled_by_name text,
  add column if not exists handled_note text;
